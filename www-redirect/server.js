import http from "node:http";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const targetHost = process.env.REDIRECT_HOST ?? "fintracker.cc";
const targetProto = process.env.REDIRECT_PROTO ?? "https";

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `${targetProto}://${targetHost}`);
  res.statusCode = 301;
  res.setHeader("Location", url.toString());
  res.end();
});

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Redirecting to ${targetProto}://${targetHost} on port ${port}`);
});

