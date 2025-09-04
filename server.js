const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // 모든 정적 파일 서빙

// data 폴더가 없으면 생성
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const popupsFilePath = path.join(dataDir, 'popups.json');

// 팝업 데이터 파일이 없으면 빈 배열로 초기화
if (!fs.existsSync(popupsFilePath)) {
    fs.writeFileSync(popupsFilePath, '[]');
}

// 팝업 목록 가져오기
app.get('/api/popups', (req, res) => {
    try {
        const data = fs.readFileSync(popupsFilePath, 'utf8');
        const popups = JSON.parse(data);
        res.json(popups);
    } catch (error) {
        console.error('팝업 목록 읽기 오류:', error);
        res.status(500).json({ error: '팝업 목록을 불러올 수 없습니다.' });
    }
});

// 팝업 저장/수정
app.post('/api/popups', (req, res) => {
    try {
        const newPopup = req.body;
        
        // 기존 데이터 읽기
        const data = fs.readFileSync(popupsFilePath, 'utf8');
        let popups = JSON.parse(data);
        
        if (newPopup.id) {
            // 수정: 기존 팝업 찾아서 업데이트
            const index = popups.findIndex(p => p.id === newPopup.id);
            if (index !== -1) {
                popups[index] = newPopup;
            } else {
                // ID는 있지만 기존 팝업을 찾을 수 없으면 새로 추가
                popups.push(newPopup);
            }
        } else {
            // 새 팝업 추가: ID 생성
            newPopup.id = Date.now();
            popups.push(newPopup);
        }
        
        // 파일에 저장
        fs.writeFileSync(popupsFilePath, JSON.stringify(popups, null, 2));
        
        res.json({ success: true, popup: newPopup });
    } catch (error) {
        console.error('팝업 저장 오류:', error);
        res.status(500).json({ error: '팝업을 저장할 수 없습니다.' });
    }
});

// 팝업 삭제
app.delete('/api/popups/:id', (req, res) => {
    try {
        const popupId = parseInt(req.params.id);
        
        // 기존 데이터 읽기
        const data = fs.readFileSync(popupsFilePath, 'utf8');
        let popups = JSON.parse(data);
        
        // 해당 ID의 팝업 제거
        popups = popups.filter(p => p.id !== popupId);
        
        // 파일에 저장
        fs.writeFileSync(popupsFilePath, JSON.stringify(popups, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('팝업 삭제 오류:', error);
        res.status(500).json({ error: '팝업을 삭제할 수 없습니다.' });
    }
});

// 활성 팝업만 가져오기 (메인 페이지용)
app.get('/api/popups/active', (req, res) => {
    try {
        const data = fs.readFileSync(popupsFilePath, 'utf8');
        const popups = JSON.parse(data);
        
        const currentDate = new Date().toISOString().split('T')[0];
        
        // 활성 팝업 필터링
        const activePopups = popups.filter(popup => {
            if (popup.startDate && currentDate < popup.startDate) return false;
            if (popup.endDate && currentDate > popup.endDate) return false;
            return true;
        });
        
        // 최신순 정렬
        activePopups.sort((a, b) => {
            const dateA = new Date(a.savedAt || 0);
            const dateB = new Date(b.savedAt || 0);
            return dateB - dateA;
        });
        
        res.json(activePopups);
    } catch (error) {
        console.error('활성 팝업 조회 오류:', error);
        res.status(500).json({ error: '활성 팝업을 불러올 수 없습니다.' });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log('팝업 관리 시스템이 준비되었습니다.');
});

// 프로세스 종료시 정리
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    process.exit(0);
});