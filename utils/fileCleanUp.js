import fs from "fs";
import path from "path";

export const cleanupFile = (filePath) => {
    return new Promise((resolve, reject) => {
        if (!filePath) {
            resolve();
            return;
        }

        fs.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                console.error('Error deleting file:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

export const cleanupOldFiles = (directory, hours = 24) => {
    const now = Date.now();
    const maxAge = hours * 60 * 60 * 1000;

    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directory, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('Error getting file stats:', err);
                    return;
                }

                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error('Error deleting old file:', err);
                        } else {
                            console.log('Deleted old file:', file);
                        }
                    });
                }
            });
        });
    });
};