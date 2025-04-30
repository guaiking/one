const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        // 确保数据库文件路径在服务器上是可写的
        const dbPath = path.join(process.cwd(), 'data', 'game_records.db');

        // 确保data目录存在
        const fs = require('fs');
        if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
            fs.mkdirSync(path.join(process.cwd(), 'data'));
        }

        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database connection error:', err.message);
                process.exit(1);
            } else {
                console.log('Connected to the game records database at:', dbPath);
                this.initializeDatabase();
            }
        });
    }

    // 初始化数据库表
    initializeDatabase() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS game_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TEXT NOT NULL,
                cube_count INTEGER NOT NULL,
                game_time TEXT NOT NULL,
                completion_time TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }

    // 保存游戏记录
    saveGameRecord(cubeCount, gameTime, callback) {
        const startTime = new Date().toISOString();
        const completionTime = new Date().toISOString();

        this.db.run(
            `INSERT INTO game_records (start_time, cube_count, game_time, completion_time) 
             VALUES (?, ?, ?, ?)`,
            [startTime, cubeCount, gameTime, completionTime],
            function(err) {
                if (err) {
                    console.error('Error saving game record:', err.message);
                    callback(err);
                } else {
                    console.log(`Game record saved with ID: ${this.lastID}`);
                    callback(null, this.lastID);
                }
            }
        );
    }

    // 获取所有游戏记录
    getAllGameRecords(callback) {
        this.db.all(
            `SELECT id, start_time, cube_count, game_time 
             FROM game_records 
             ORDER BY start_time DESC`,
            (err, rows) => {
                if (err) {
                    console.error('Error fetching game records:', err.message);
                    callback(err, null);
                } else {
                    callback(null, rows);
                }
            }
        );
    }

    // 关闭数据库连接
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}

// 导出单例实例
const databaseService = new DatabaseService();
module.exports = databaseService;