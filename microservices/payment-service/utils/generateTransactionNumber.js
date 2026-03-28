export function generateTransactionNumber(prefix = "TXN", digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return `${prefix}-${Math.floor(Math.random() * (max - min + 1)) + min}`;
}

export function generatePaymentTransactionId() {
  return generateTransactionNumber("PAY", 6);
}