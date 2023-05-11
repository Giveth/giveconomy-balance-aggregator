import {
  generateRandomDecimalNumber,
  generateRandomHexNumber,
} from 'test/test-utils';

describe('Random number generator test cases', () => {
  it('should generate correct length of random number in hex', () => {
    const randomNumber = generateRandomHexNumber(10);
    expect(randomNumber).toHaveLength(2 * 10);
  });

  it('should generate correct length of random number in decimal', () => {
    const bytesLength = 5;
    const randomNumberString = generateRandomDecimalNumber(bytesLength);
    const randomNumber = parseInt(randomNumberString, 10);
    expect(randomNumber.toString(16).length).toBeLessThanOrEqual(
      2 * bytesLength,
    );
  });
});
