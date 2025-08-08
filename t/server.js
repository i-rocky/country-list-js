const assert = require("assert").strict;
const http = require("http");
const listen = require("test-listen");
const server = require("../server");

function call(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  }).catch((e) => {
    console.log("REQUEST FAIL", e);
  });
}

describe("Server fetches", () => {
  var service, url;
  beforeEach(async () => {
    service = http.createServer((req, res) => {
      Promise.resolve(server(req))
        .then((body) => {
          const payload = Buffer.from(JSON.stringify(body));
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.setHeader("content-length", String(payload.length));
          res.end(payload);
        })
        .catch((err) => {
          res.statusCode = 500;
          res.end(String(err && err.message ? err.message : err));
        });
    });
    url = await listen(service);
  });
  afterEach(() => {
    service.close();
  });

  it("niladic method", async () => {
    var actual = await call(url + "/?method=continents");
    var expected = [
      "Asia",
      "Europe",
      "Africa",
      "North America",
      "Oceania",
      "South America",
      "Antarctica",
    ];
    assert.deepEqual(actual, expected);
  });
  it("monadic method", async () => {
    var actual = await call(url + "/?method=findByIso2&code=DK");
    var expected = {
      name: "Denmark",
      continent: "Europe",
      region: "Scandinavia, Nordic Countries",
      capital: "Copenhagen",
      currency: { code: "DKK", symbol: "Dkr", decimal: "2" },
      dialing_code: "45",
      provinces: [
        { name: "Hovedstaden", alias: null },
        { name: "Midtjylland", alias: null },
        { name: "Nordjylland", alias: null },
        { name: "Sjælland", alias: ["Zealand"] },
        { name: "Syddanmark", alias: null },
      ],
      code: { iso2: "DK", iso3: "DNK" },
    };
    assert.deepEqual(actual, expected);
  });
});
