export const etriApi = async (
  apiKey: string,
  text: string,
  analysisCode: string = "morp"
) => {
  try {
    const response = await fetch("http://aiopen.etri.re.kr:8000/WiseNLU", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request_id: "reserved field",
        argument: {
          analysis_code: analysisCode,
          text: text,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error calling ETRI API:", error);
    throw error;
  }
};
