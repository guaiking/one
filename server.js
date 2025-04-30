const express = require('express');
const path = require('path');
const databaseService = require('./database'); // 导入数据库服务

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API路由
app.get('/api/records', (req, res) => {
    databaseService.getAllGameRecords((err, records) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(records);
    });
});

app.post('/api/records', (req, res) => {
    const { cubeCount, gameTime } = req.body;
    if (!cubeCount || !gameTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    databaseService.saveGameRecord(cubeCount, gameTime, (err, recordId) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: recordId, success: true });
    });
});

// 所有路由都返回index.html，让前端路由处理
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 处理进程退出时关闭数据库连接
process.on('SIGINT', () => {
    databaseService.close();
    process.exit();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});