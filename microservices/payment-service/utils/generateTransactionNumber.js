// Generates TXN-DDMMYY-NUMBER
export function generateTransactionNumber(prefix = "TXN") {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${prefix}-${dd}${mm}${yy}-${randomNum}`;
}

export function generatePaymentTransactionId() {
  return generateTransactionNumber("PAY", 6);
}
