import React, { useState, useEffect, useCallback } from 'react';
import { 
  uploadTaskFile, 
  fetchTaskFiles, 
  deleteTaskFile, 
  downloadTaskFile 
} from '../services/taskFileService';
import styles from '../componentsStyles/TaskFiles.module.css';

const TaskFiles = ({ taskId, isProjectOwner }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const fetchedFiles = await fetchTaskFiles(taskId);
      setFiles(fetchedFiles);
    } catch (err) {
      setError('Failed to load files');
    }
  }, [taskId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = [...e.dataTransfer.files];
    await handleFileUpload(files[0]);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setError('');
    
    try {
      await uploadTaskFile(taskId, file);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteTaskFile(taskId, fileId);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      await downloadTaskFile(taskId, fileId, fileName);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className={styles.filesContainer}>
      <div 
        className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className={styles.fileInput}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
        <label htmlFor="file-upload" className={styles.uploadLabel}>
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.fileList}>
        {files.length > 0 ? (
          files.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <div className={styles.fileNameSection}>
                  <span className={styles.fileName}>{file.file_name}</span>
                  <span className={styles.fileType}>
                    {file.mime_type.split('/')[1].toUpperCase()}
                  </span>
                </div>
                <div className={styles.fileDetails}>
                  <span className={styles.fileSize}>
                    {formatFileSize(file.file_size)}
                  </span>
                  <span className={styles.fileUploader}>
                    Uploaded by {file.uploader?.name || 'Unknown'}
                  </span>
                  <span className={styles.fileDate}>
                    {formatTimestamp(file.created_at)}
                  </span>
                </div>
              </div>
              <div className={styles.fileActions}>
                <button
                  onClick={() => handleDownload(file.id, file.file_name)}
                  className={styles.downloadButton}
                >
                  Download
                </button>
                {(file.uploader?.id === JSON.parse(localStorage.getItem('user'))?.id || isProjectOwner) && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noFiles}>No files uploaded yet</p>
        )}
      </div>
    </div>
  );
};

export default TaskFiles;
