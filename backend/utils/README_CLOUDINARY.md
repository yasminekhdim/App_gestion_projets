# Guide d'utilisation Cloudinary

## Structure des dossiers

Tous les fichiers sont organisés sous `projectHub/` avec cette structure :

```
projectHub/
├── identite/          ← Pièces d'identité (proof_of_id)
├── profile_pics/      ← Photos de profil
├── projets/           ← Cahiers des charges (profs)
├── rendus/
│   └── {taskId}/      ← Rendus de tâches (ex: rendus/42)
└── divers/            ← Autres fichiers
```

## Utilisation

### Upload d'un fichier

```javascript
import { uploadFile, FOLDER_TYPES } from "../utils/cloudinaryUpload.js";

// Exemple 1: Upload d'une pièce d'identité
const result = await uploadFile(req.file, FOLDER_TYPES.IDENTITE);
// → projectHub/identite/filename

// Exemple 2: Upload d'une photo de profil
const result = await uploadFile(req.file, FOLDER_TYPES.PROFILE_PICS);
// → projectHub/profile_pics/filename

// Exemple 3: Upload d'un cahier des charges
const result = await uploadFile(req.file, FOLDER_TYPES.PROJETS);
// → projectHub/projets/filename

// Exemple 4: Upload d'un rendu de tâche (avec sous-dossier)
const taskId = 42;
const result = await uploadFile(req.file, FOLDER_TYPES.RENDUS, taskId);
// → projectHub/rendus/42/filename

// Exemple 5: Upload d'un fichier divers
const result = await uploadFile(req.file, FOLDER_TYPES.DIVERS);
// → projectHub/divers/filename
```

### Suppression d'un fichier

```javascript
import { deleteFile } from "../utils/cloudinaryUpload.js";

const publicId = "projectHub/identite/abc123";
await deleteFile(publicId);
```

## Types de dossiers disponibles

- `FOLDER_TYPES.IDENTITE` → `projectHub/identite`
- `FOLDER_TYPES.PROFILE_PICS` → `projectHub/profile_pics`
- `FOLDER_TYPES.PROJETS` → `projectHub/projets`
- `FOLDER_TYPES.RENDUS` → `projectHub/rendus/{subFolder}`
- `FOLDER_TYPES.DIVERS` → `projectHub/divers`

## Configuration

Le preset Cloudinary utilisé est `projectHub` (configuré dans `.env`).

