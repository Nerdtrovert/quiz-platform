const CODE_FENCE_RE = /```([\w+-]*)\n?([\s\S]*?)```/g;

function buildSegments(text) {
  const input = typeof text === "string" ? text : "";
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = CODE_FENCE_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: input.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      value: match[2].replace(/\n$/, ""),
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({
      type: "text",
      value: input.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: input }];
}

export default function RichQuestionText({
  text,
  style,
  codeStyle,
  containerStyle,
}) {
  const segments = buildSegments(text);

  return (
    <div style={containerStyle}>
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          return (
            <pre
              key={`code-${index}`}
              style={{
                margin: index === 0 ? 0 : "0.9rem 0 0",
                padding: "0.9rem 1rem",
                background: "#111",
                border: "1px solid #222",
                borderRadius: "10px",
                overflowX: "auto",
                fontSize: "0.92em",
                lineHeight: 1.55,
                color: "#f3e7cf",
                fontFamily:
                  "'Consolas', 'SFMono-Regular', 'Liberation Mono', monospace",
                ...codeStyle,
              }}
            >
              <code>{segment.value}</code>
            </pre>
          );
        }

        if (!segment.value.trim()) {
          return null;
        }

        return (
          <div
            key={`text-${index}`}
            style={{
              marginTop: index === 0 ? 0 : "0.7rem",
              whiteSpace: "pre-wrap",
              ...style,
            }}
          >
            {segment.value.trim()}
          </div>
        );
      })}
    </div>
  );
}
