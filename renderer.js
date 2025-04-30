//const databaseService = require('./database');
class MainRenderer {
    constructor() {

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        this.cubeScene = new CubeScene(this.scene);
        this.galaxyScene = new GalaxyScene(this.scene);
        this.keys = {};
        this.gameOver = false;

        this.gameStartTime = 0;
        this.gameTime = 0;
        this.timerInterval = null;

        this.init();
        this.initControls();


    }

    startTimer() {
        if (this.isTimerRunning) return; // 防止重复启动

        this.gameStartTime = Date.now() - this.gameTime; // 考虑暂停后恢复的情况
        this.isTimerRunning = true;

        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 10);
    }

    updateTimer() {
        if (!this.gameOver) {
            this.gameTime = Date.now() - this.gameStartTime;
            this.displayTime(this.gameTime);
        }
    }

    displayTime(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const centiseconds = Math.floor((milliseconds % 1000) / 10);

        document.getElementById('timeDisplay').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.isTimerRunning = false;
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 100, 150);
        this.camera.lookAt(0, 0, 0);

        this.animate();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.galaxyScene.onKeyDown(e);

            // 重新开始游戏
            if (this.gameOver && e.key === 'r') {
                this.restartGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.galaxyScene.onKeyUp(e);
        });

        // 添加查看历史记录按钮事件
        document.getElementById('showRecordsBtn')?.addEventListener('click', () => {
            this.showGameRecords();
        });

        // 添加关闭模态框事件
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            document.getElementById('recordsModal').style.display = 'none';
        });
    }

    // 添加显示游戏记录的方法
    showGameRecords() {
        fetch('/api/records')
            .then(response => response.json())
            .then(records => {
                const tbody = document.querySelector('#recordsTable tbody');
                tbody.innerHTML = '';

                records.forEach(record => {
                    const row = document.createElement('tr');
                    const date = new Date(record.start_time);
                    const formattedDate = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                    row.innerHTML = `
                        <td style="border: 1px solid #444; padding: 8px;">${formattedDate}</td>
                        <td style="border: 1px solid #444; padding: 8px;">${record.cube_count}</td>
                        <td style="border: 1px solid #444; padding: 8px;">${record.game_time}</td>
                    `;
                    tbody.appendChild(row);
                });

                document.getElementById('recordsModal').style.display = 'block';
            })
            .catch(err => {
                console.error('Error fetching records:', err);
            });
    }

    checkCollisions() {
        if (this.gameOver) return;

        const starCore = this.galaxyScene.getStarCore();
        const activeCubes = this.cubeScene.getActiveCubes();

        // 检测与每个立方体的碰撞
        activeCubes.forEach(cube => {
            if (CollisionDetector.sphereBoxCollision(starCore, cube)) {
                this.cubeScene.removeCube(cube);

                // 检查游戏是否结束
                if (this.cubeScene.activeCubes.size === 0) {
                    this.endGame();
                }
            }
        });
    }

    endGame() {
        this.gameOver = true;
        this.stopTimer();

        // 获取游戏数据
        const cubeCount = this.cubeScene.cubes.length;
        const gameTime = document.getElementById('timeDisplay').textContent;

        // 保存到服务器
        fetch('/api/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cubeCount, gameTime })
        })
            .catch(err => {
                console.error('Failed to save game record:', err);
            });

        const gameStatus = document.getElementById('gameStatus');
        gameStatus.innerHTML = `
            游戏完成!<br>
            用时: ${gameTime}<br>
            立方体数量: ${cubeCount}<br>
            按R键重新开始
        `;
        gameStatus.style.display = 'block';
    }

    restartGame() {
        // 清除场景
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // 重置游戏状态
        this.gameOver = false;
        document.getElementById('gameStatus').style.display = 'none';

        // 重新初始化场景
        this.cubeScene = new CubeScene(this.scene);
        this.galaxyScene = new GalaxyScene(this.scene);
        this.stopTimer();
        this.gameTime = 0;
        this.displayTime(0);
        this.startTimer();
    }

    animate() {

        // 在游戏开始时启动计时器
        if (!this.gameStartTime && !this.gameOver) {
            this.startTimer();
        }

        requestAnimationFrame(() => this.animate());

        if (!this.gameOver) {
            this.cubeScene.animate();
            this.galaxyScene.animate();
            this.checkCollisions();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化主渲染器
const mainRenderer = new MainRenderer();
window.mainRenderer = mainRenderer;

// 窗口大小调整
window.addEventListener('resize', () => {
    mainRenderer.camera.aspect = window.innerWidth / window.innerHeight;
    mainRenderer.camera.updateProjectionMatrix();
    mainRenderer.renderer.setSize(window.innerWidth, window.innerHeight);
});