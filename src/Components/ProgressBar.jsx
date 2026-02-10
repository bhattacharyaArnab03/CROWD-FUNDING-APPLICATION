function ProgressBar({ raised, goal }) {
  const percent = (raised / goal) * 100;

  return (
    <div className="progress">
      <div className="fill" style={{ width: `${percent}%` }}></div>
    </div>
  );
}

export default ProgressBar;
