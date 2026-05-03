#!/bin/bash
# Agent World Tracker Hook for Claude Code
# This script is called by Claude Code hooks to track agent tool usage.
#
# Usage in .claude/settings.json:
# {
#   "hooks": {
#     "PostToolUse": [
#       {
#         "matcher": "Agent",
#         "hooks": [{ "type": "command", "command": "/path/to/agent-tracker.sh" }]
#       }
#     ]
#   }
# }
#
# The hook reads the tool use from stdin (JSON with tool_name, tool_input, tool_output fields)

AGENT_WORLD_URL="${AGENT_WORLD_URL:-http://localhost:3333}"

# Read the hook input from stdin
INPUT=$(cat)

# Extract tool info
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)

if [ "$TOOL_NAME" = "Agent" ]; then
  # Extract agent details from the tool input
  DESCRIPTION=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
inp = d.get('tool_input', {})
print(inp.get('description', 'Unknown task'))
" 2>/dev/null)

  AGENT_TYPE=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
inp = d.get('tool_input', {})
print(inp.get('subagent_type', 'general-purpose'))
" 2>/dev/null)

  PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
inp = d.get('tool_input', {})
p = inp.get('prompt', '')
print(p[:100])
" 2>/dev/null)

  # Generate a unique agent ID
  AGENT_ID="cc-$(date +%s)-$(shuf -i 1000-9999 -n 1)"

  # Create agent in Agent World
  curl -s -X POST "$AGENT_WORLD_URL/api/agents" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$AGENT_ID\",
      \"type\": \"$AGENT_TYPE\",
      \"task\": \"$DESCRIPTION\",
      \"thoughts\": \"$PROMPT\"
    }" > /dev/null 2>&1

fi

# Always exit 0 so we don't block Claude Code
exit 0
