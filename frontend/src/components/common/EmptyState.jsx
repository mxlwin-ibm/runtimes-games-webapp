import { Tile } from "@carbon/react";
import { Information } from "@carbon/icons-react";

const EmptyState = ({ title, description, icon: Icon = Information }) => {
  return (
    <Tile style={{ textAlign: "center", padding: "3rem" }}>
      <Icon size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
      <h3 style={{ marginBottom: "0.5rem" }}>{title}</h3>
      <p style={{ color: "#525252" }}>{description}</p>
    </Tile>
  );
};

export default EmptyState;

// Made with Bob
