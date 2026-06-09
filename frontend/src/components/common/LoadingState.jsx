import { SkeletonText, SkeletonPlaceholder } from "@carbon/react";

const LoadingState = ({ type = "text", rows = 5 }) => {
  if (type === "placeholder") {
    return (
      <div style={{ padding: "2rem" }}>
        <SkeletonPlaceholder style={{ width: "100%", height: "200px" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <SkeletonText paragraph lineCount={rows} />
    </div>
  );
};

export default LoadingState;

// Made with Bob
