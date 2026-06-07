export default function Panel({ children, className = "", hover = false, as: Tag = "section" }) {
  return (
    <Tag className={`glass-card ${hover ? "glass-hover" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
