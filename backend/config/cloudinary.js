import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin du répertoire actuel (nécessaire pour ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env dans le dossier backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Vérifier que les variables d'environnement sont bien chargées
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Erreur: Variables Cloudinary manquantes dans .env');
  console.error('Vérifiez que votre fichier .env contient:');
  console.error('  CLOUDINARY_CLOUD_NAME=...');
  console.error('  CLOUDINARY_API_KEY=...');
  console.error('  CLOUDINARY_API_SECRET=...');
  console.error('Valeurs actuelles:', { cloudName, apiKey, apiSecret: apiSecret ? '***' : undefined });
}

// Configuration Cloudinary
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  console.log('✅ Configuration Cloudinary chargée avec succès');
} else {
  console.warn('⚠️ Configuration Cloudinary incomplète - les uploads échoueront');
}

// Structure de dossiers Cloudinary
export const CLOUDINARY_FOLDERS = {
  IDENTITE: 'projectHub/identite',
  PROFILE_PICS: 'projectHub/profile_pics',
  PROJETS: 'projectHub/projets',
  RENDUS: 'projectHub/rendus',
  DIVERS: 'projectHub/divers',
};

// Upload Preset
export const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'projectHub';

export default cloudinary;

