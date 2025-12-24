/**
 * Calculate penalty for late submissions
 * Policy: Flat 20% reduction if the deadline is crossed.
 * @param {Date} deadline - Project deadline
 * @param {Number} baseAmount - Original payment amount
 * @param {Date} [submissionDate] - Optional date of submission
 * @returns {Object} - Contains daysLate, penaltyAmount, and finalAmount
 */
const calculatePenalty = (deadline, baseAmount, submissionDate) => {
  const compareDate = submissionDate ? new Date(submissionDate) : new Date();
  const deadlineDate = new Date(deadline);
  const daysLate = Math.max(0, Math.ceil((compareDate - deadlineDate) / (1000 * 60 * 60 * 24)));

  if (daysLate === 0) {
    return {
      daysLate: 0,
      penaltyAmount: 0,
      finalAmount: baseAmount,
    };
  }

  // Flat 20% penalty if the deadline is crossed, regardless of the number of days late.
  const penaltyPercentage = 20;
  const penaltyAmount = (baseAmount * penaltyPercentage) / 100;
  const finalAmount = Math.max(0, baseAmount - penaltyAmount);

  return {
    daysLate,
    penaltyAmount,
    finalAmount,
  };
};

module.exports = calculatePenalty;

