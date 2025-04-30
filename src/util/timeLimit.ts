/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Promise에 타임아웃을 적용하는 도우미 함수
 * @param promise 제한할 Promise
 * @param ms 시간 제한 (밀리초)
 * @param errorMessage 타임아웃 오류 메시지
 * @returns 원래 Promise 또는 타임아웃 오류가 발생한 Promise
 */
export const timeLimit = <T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = "Operation timed out"
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};
