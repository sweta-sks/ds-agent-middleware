import express from "express";
import multer from "multer";
import { DSAgentClient } from "./src/api/ds-agent-client";
import { loggerMiddleware } from "./src/middleware/logger";
import { MiddlewareAgent } from "./src/agents/middleware-agent";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// app.use("/api/upload", express.static(path.join(__dirname, "uploads")));

const apiClient = new DSAgentClient(
  "http://localhost:3000",
  "8797893D-7F0D-4B5F-9F6E-DE1706BC33D0"
);

// const maskMiddleware = async (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction
// ) => {
//   try {
//     const agent = await MiddlewareAgent.init("MWARE-20250714-1860", apiClient);
//     const contentType = req.headers["content-type"];
//     if (req.body) {
//       req.body = await agent.maskData(req.body, contentType);
//     }
//     next();
//   } catch (error) {
//     console.error("Masking middleware error:", error);
//     res.status(500).send("Data masking failed");
//   }
// };

app.get("/api/upload/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const agent = await MiddlewareAgent.init("AGENT-ID", apiClient);
    const maskedData = await agent.maskData(filePath);

    const fileExt = path.extname(filename).toLowerCase();

    // if (filename.endsWith(".json")) {
    //   res.setHeader("Content-Type", "application/json");
    //   return res.send(maskedData);
    // }

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Type", getMimeType(fileExt));
    res.send(maskedData);
  } catch (error) {
    console.error("Masking error:", error);
    res.status(500).send("Failed to mask file");
  }
});

function getMimeType(ext: string) {
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".txt":
      return "text/plain";
    case ".xml":
      return "application/xml";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

app.get("/data", (req, res) => {
  const jsonFilePath = path.join(__dirname, "/uploads/sample.json");
  fs.readFile(jsonFilePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read file" });
    }
    res.setHeader("Content-Type", "application/json");
    console.log(data);
    res.send(data);
  });
});
// app.post("/mask", maskMiddleware, upload.single("file"), async (req, res) => {
//   try {
//     console.log("Received file:", req.file?.originalname);
//     console.log("File buffer size:", req.file?.buffer?.length);
//     const agent = await MiddlewareAgent.init("MWARE-20250714-1860", apiClient);
//     const contentType = req.headers["content-type"] || req.file?.mimetype;

//     const inputData = req.file ? req.file : req.body;

//     const result = await agent.maskData(inputData, contentType);
//     res.send(result);
//   } catch (err) {
//     console.error("Error in /mask route:", err);
//     res.status(500).send("Internal Server Error");
//   }
// });
app.post(
  "/test-upload",
  loggerMiddleware,
  upload.single("file"),
  (req, res) => {
    console.log("File received:", req.file?.originalname);
    res.send("Middleware passed. File received.");
  }
);

app.get("/v1/dsagent/getDSAgentById", (req, res) => {
  const { accountId, agentId } = req.query;

  if (!accountId || !agentId) {
    return res.status(400).json({ message: "Missing accountId or agentId" });
  }

  return res.json({
    success: true,
    data: {
      agentId,
      accountId,
      agentName: "Middleware Agent",
      status: "active",
      lastSeen: new Date().toISOString(),
      configurations: {
        action: {
          isMask: true,
          isEncrypt: false,
        },
        esc: "ZbxyGFftUhbhfdty75cvh33Gjb7854Cvbuj7654",
        regxRules: [
          {
            name: "Email",
            description:
              "Mask the email, abcdef@email.com to ac***ef@email.com",
            pattern:
              "([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*([a-zA-Z0-9]{3})@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",
            maskWith: "*",
            isFullMask: false,
          },
          {
            name: "Mobile",
            description: "Mask the mobile like +91-98******76 or 98******76",
            pattern: "(\\+91[-\\s]?)?([6-9]\\d)(\\d{4})(\\d{2})",
            maskWith: "*",
            isFullMask: false,
          },
        ],
        logFolders: ["C:\\Office\\Demo\\logs", "C:\\Office\\Demo\\logs2"],
        logFilesExtentions: ["log"],
        documentFolders: ["C:\\Office\\Demo\\docs"],
        documentFilesExtentions: ["pdf", "docx", "json", "xml"],
        documentOutputFolders: ["C:\\Office\\Demo\\docsop"],
      },
    },
  });
});
app.get("/", (req, res) => {
  res.send("✅ Server is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
