import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé."), false);
    }
  },
});

export const uploadFiles = (fieldName = "files", maxCount = 10) => (req, res, next) => {
  upload.array(fieldName, maxCount)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Un ou plusieurs fichiers sont trop volumineux (max 10MB chacun)" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ message: "Trop de fichiers (max 10 à la fois)" });
        }
        return res.status(400).json({ message: "Erreur lors du téléversement des fichiers" });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};
