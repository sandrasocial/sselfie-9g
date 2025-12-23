import { readFile, writeFile, mkdir, readdir, unlink } from "fs/promises"
import { join } from "path"

const BACKUP_DIR = join(process.cwd(), '.alex-backups')
const MAX_BACKUPS_PER_FILE = 10

export interface BackupInfo {
  filePath: string
  backupPath: string
  timestamp: number
  changeId: string
  reason?: string
}

/**
 * Create a backup of a file before modification
 */
export async function createBackup(
  filePath: string,
  reason?: string
): Promise<BackupInfo> {
  try {
    // Ensure backup directory exists
    await mkdir(BACKUP_DIR, { recursive: true })

    // Read original file
    const content = await readFile(filePath, 'utf-8')

    // Generate backup path
    const timestamp = Date.now()
    const changeId = `change_${timestamp}_${Math.random().toString(36).substring(7)}`
    const fileName = filePath.replace(/\//g, '_').replace(/\./g, '_')
    const backupPath = join(BACKUP_DIR, `${fileName}_${timestamp}.backup`)

    // Write backup
    await writeFile(backupPath, content, 'utf-8')

    // Save backup metadata
    const metadataPath = join(BACKUP_DIR, `${fileName}_${timestamp}.meta.json`)
    const metadata = {
      filePath,
      backupPath,
      timestamp,
      changeId,
      reason: reason || 'Code modification',
      contentLength: content.length
    }
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

    // Clean up old backups (keep only last 10)
    await cleanupOldBackups(fileName)

    console.log(`[Alex] Created backup: ${backupPath}`)

    return {
      filePath,
      backupPath,
      timestamp,
      changeId,
      reason
    }
  } catch (error: any) {
    console.error("[Alex] Error creating backup:", error)
    throw new Error(`Failed to create backup: ${error.message}`)
  }
}

/**
 * Get backup information by change ID
 */
export async function getBackup(changeId: string): Promise<BackupInfo & { content: string }> {
  try {
    // Find metadata file with this changeId
    const files = await readdir(BACKUP_DIR)
    const metaFile = files.find(f => f.endsWith('.meta.json'))

    if (!metaFile) {
      throw new Error(`Backup not found for change ID: ${changeId}`)
    }

    // Read metadata
    const metadataPath = join(BACKUP_DIR, metaFile)
    const metadataContent = await readFile(metadataPath, 'utf-8')
    const metadata = JSON.parse(metadataContent) as BackupInfo & { contentLength: number }

    if (metadata.changeId !== changeId) {
      // Search all metadata files
      const allMetaFiles = files.filter(f => f.endsWith('.meta.json'))
      for (const meta of allMetaFiles) {
        const metaPath = join(BACKUP_DIR, meta)
        const metaContent = await readFile(metaPath, 'utf-8')
        const metaData = JSON.parse(metaContent) as BackupInfo
        if (metaData.changeId === changeId) {
          const content = await readFile(metaData.backupPath, 'utf-8')
          return { ...metaData, content }
        }
      }
      throw new Error(`Backup not found for change ID: ${changeId}`)
    }

    // Read backup content
    const content = await readFile(metadata.backupPath, 'utf-8')

    return {
      ...metadata,
      content
    }
  } catch (error: any) {
    console.error("[Alex] Error getting backup:", error)
    throw new Error(`Failed to get backup: ${error.message}`)
  }
}

/**
 * Restore file from backup
 */
export async function restoreFromBackup(changeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const backup = await getBackup(changeId)
    
    // Restore original file
    await writeFile(backup.filePath, backup.content, 'utf-8')

    console.log(`[Alex] Restored file from backup: ${backup.filePath}`)

    return {
      success: true,
      message: `Successfully rolled back ${backup.filePath} to state from ${new Date(backup.timestamp).toLocaleString()}`
    }
  } catch (error: any) {
    console.error("[Alex] Error restoring from backup:", error)
    throw new Error(`Failed to restore from backup: ${error.message}`)
  }
}

/**
 * Get recent backups for a file
 */
export async function getRecentBackups(filePath: string, limit: number = 10): Promise<BackupInfo[]> {
  try {
    const files = await readdir(BACKUP_DIR)
    const fileName = filePath.replace(/\//g, '_').replace(/\./g, '_')
    const relevantBackups = files
      .filter(f => f.startsWith(fileName) && f.endsWith('.meta.json'))
      .map(async (f) => {
        const metaPath = join(BACKUP_DIR, f)
        const metaContent = await readFile(metaPath, 'utf-8')
        return JSON.parse(metaContent) as BackupInfo
      })

    const backups = await Promise.all(relevantBackups)
    return backups
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  } catch (error: any) {
    console.error("[Alex] Error getting recent backups:", error)
    return []
  }
}

/**
 * Clean up old backups, keeping only the most recent N
 */
async function cleanupOldBackups(fileName: string): Promise<void> {
  try {
    const files = await readdir(BACKUP_DIR)
    const backups = files
      .filter(f => f.startsWith(fileName) && f.endsWith('.backup'))
      .map(f => ({
        name: f,
        path: join(BACKUP_DIR, f),
        timestamp: parseInt(f.split('_').pop()?.replace('.backup', '') || '0')
      }))
      .sort((a, b) => b.timestamp - a.timestamp)

    // Keep only the most recent MAX_BACKUPS_PER_FILE
    const toDelete = backups.slice(MAX_BACKUPS_PER_FILE)
    
    for (const backup of toDelete) {
      try {
        await unlink(backup.path)
        // Also delete metadata file
        const metaFile = backup.name.replace('.backup', '.meta.json')
        const metaPath = join(BACKUP_DIR, metaFile)
        try {
          await unlink(metaPath)
        } catch (e) {
          // Metadata might not exist, that's okay
        }
      } catch (e) {
        // File might already be deleted, continue
      }
    }
  } catch (error: any) {
    console.warn("[Alex] Error cleaning up old backups:", error.message)
    // Non-critical, continue
  }
}

