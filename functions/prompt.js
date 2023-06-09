const { SSM } = require("aws-sdk")
const {
  GPT_API_KEY_ENV,
  request,
} = require("./utils")

const GPT_API_PARAM_NAME = process.env[GPT_API_KEY_ENV]
const gptModel = process.env.GPT_MODEL

exports.handler = async (event) => {
  const prompt = JSON.parse(event.body).prompt

  console.log("Prompt: ", prompt)

  const ssm = new SSM()

  const { Parameter: {
    Value: apiKey,
  } } = await ssm.getParameter({
    Name: GPT_API_PARAM_NAME,
    WithDecryption: true,
  }).promise()

  console.log("Got API KEY: ", apiKey.replace(/./g, "*"))

  try {
    const { body: bodyStr } = await request(
      "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: gptModel,
        messages: prompt,
        max_tokens: 4096,
      }
    })

    const body = bodyStr && JSON.parse(bodyStr)
    console.log("Got response", { body })

    return {
      statusCode: 200,
      body: JSON.stringify({
        messages: body.choices?.[0]?.message,
      }),
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "https://api.openai.com",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      },
    }
  }
  catch (err) {
    if (!err.response || err.response.statusCode !== 429) {
      throw err
    }

    return {
      statusCode: 429,
      body: err.body,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  }
}
