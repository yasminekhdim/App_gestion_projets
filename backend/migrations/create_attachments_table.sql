-- Table pour stocker les pièces jointes (attachments) des projets et tâches
CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Type d'entité (projet ou tâche)
    entity_type ENUM('projet', 'tache') NOT NULL,
    entity_id INT NOT NULL,
    
    -- Informations du fichier
    fichier_url VARCHAR(500) NOT NULL,
    fichier_name VARCHAR(255) NOT NULL,
    fichier_public_id VARCHAR(255) NOT NULL,
    
    -- Métadonnées
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size INT NULL, -- Taille en bytes
    file_type VARCHAR(100) NULL, -- MIME type
    
    -- Index pour améliorer les performances
    INDEX idx_entity (entity_type, entity_id),
    
    -- Note: On ne peut pas avoir une FK conditionnelle pour les deux types d'entités
    -- Les contraintes sont gérées au niveau applicatif
    -- Pour les projets: entity_type='projet' et entity_id référence projets.id
    -- Pour les tâches: entity_type='tache' et entity_id référence taches.id
    
    UNIQUE KEY unique_public_id (fichier_public_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

