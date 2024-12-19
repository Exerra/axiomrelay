const crypto = require("crypto")

const publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqU+vRx/b0buixRHGFY3e\nXlE5+WF0sDn29yMMByTzGd6xChg4nYFwLCNsabG7THzq/sc3cxN3o6rwa676N1xk\nEtf/XNNDRZ1uUn/ZJlZVHBws3Gbr/7I+WU5+7L/qgZR2SgsUMK54El1vB1K3pM41\n4SSeb14vQuvhHIBLPA8MjUELelfUDAqLonAO/5j+Xpd8tTdDLKS5KkS5Dyx+eQ5A\nRpFX1x1A6160uzPkc5eb9nPIb6oa+Xl1Lk1636x6GI/2qbms+snorCTZiHFwAbiB\nnh5gSO+QxlqcTQGLBllbZbQV5bZZ+09FuzIeeXzGUaDK1iWgDfG5Os9Tl2fTRDCc\nGQIDAQAB\n-----END PUBLIC KEY-----\n"

const signature = "DpQ2bW9BhwEXlp1W1p358sF/R9HzMd3JoFbE3rs8qcgEuR69/bk8+CWa4WG4XHmKYdiUke0uUWexalmWf/gNYTFEF+EnjLljMNXIutxa6hHD9UxDBsdKuwfkHcZsvJsgCZz2VAZ7UO+dLisC+cfLlOG3th07ONbpLt0/DR7Tku2PVo6wiK7dbG08vJTfQqdac3GQdbbNh/+W9YJ7yz//PfMOxaAbAATa5yPk73qug1HnHAyEWkDOiHXrzhms3WKB9E/oKWhBotcya4vCkCDJ9NBK6sqFDa7YWh2LF4xgbFjNpLApl1z1saEK4RkBcreSWTUgtVIfqWhP0nkVBZazPA=="

const verify = crypto.createVerify("rsa-sha256")

const lolol = `(request-target): post /inbox
date: Thu, 19 Dec 2024 17:05:39 GMT
host: fedi.exerra.xyz
digest: SHA-256=MX5NUj3aeRsSetrED0EdQF8VZfDVP6WXb4uyM1h2/qU=`

verify.update(lolol)

console.log(verify.verify(publicKey, signature, "base64"))