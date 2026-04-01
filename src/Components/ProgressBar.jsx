function ProgressBar({ raised, goal }) {
  const percent = goal > 0 ? (raised / goal) * 100 : 0;

  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }}></div>
    </div>
  );
}

export default ProgressBar;
