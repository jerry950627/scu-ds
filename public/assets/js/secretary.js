// 文書部管理系統

// 顯示訊息函數
function showMessage(containerId, message, type = 'success') {
    if (typeof ErrorHandler !== 'undefined') {
        if (type === 'error') {
            ErrorHandler.showError(message);
        } else if (type === 'success') {
            ErrorHandler.showSuccess(message);
        } else {
            // 對於其他類型，使用原有的實現
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
            const icon = type === 'success' ? '✅' : '❌';
            
            container.innerHTML = `
                <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                    ${icon} ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            
            // 5秒後自動隱藏
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }
    } else {
        // 備用實現
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const icon = type === 'success' ? '✅' : '❌';
        
        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${icon} ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 5秒後自動隱藏
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// 更新進度條
function updateProgress(progressId, percent) {
    const progressBar = document.getElementById(progressId);
    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('aria-valuenow', percent);
    }
}

// 載入會議記錄列表
async function loadMeetings() {
    try {
        const response = await fetch('/api/secretary/meetings');
        if (!response.ok) throw new Error('無法載入會議記錄');
        
        const meetings = await response.json();
        const meetingList = document.getElementById('meetingList');
        
        if (!meetingList) return;
        
        meetingList.innerHTML = '';
        
        if (meetings.length === 0) {
            meetingList.innerHTML = '<li class="list-group-item text-center text-muted">暫無會議記錄</li>';
            return;
        }
        
        meetings.forEach(meeting => {
            const meetingDate = new Date(meeting.date).toLocaleDateString('zh-TW');
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            listItem.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${meeting.topic || '無主題'}</div>
                    <small class="text-muted">
                        📅 ${meetingDate}
                        ${meeting.filename ? ' | 📎 有附件' : ''}
                    </small>
                    <div class="mt-1">
                        <small>${meeting.content ? meeting.content.substring(0, 100) + '...' : '無內容'}</small>
                    </div>
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewMeeting(${meeting.id})">
                        👁️ 查看
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editMeeting(${meeting.id})">
                        ✏️ 編輯
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="exportMeeting(${meeting.id})">
                        📤 匯出
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMeeting(${meeting.id})">
                        🗑️ 刪除
                    </button>
                </div>
            `;
            
            meetingList.appendChild(listItem);
        });
    } catch (error) {
        console.error('載入會議記錄失敗:', error);
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showError('載入會議記錄失敗: ' + error.message);
        } else {
            showMessage('meetingMessages', '載入會議記錄失敗: ' + error.message, 'error');
        }
    }
}

// 載入活動記錄列表
async function loadActivities() {
    try {
        const response = await fetch('/api/secretary/activities');
        if (!response.ok) throw new Error('無法載入活動記錄');
        
        const activities = await response.json();
        const activityList = document.getElementById('activityList');
        
        if (!activityList) return;
        
        activityList.innerHTML = '';
        
        if (activities.length === 0) {
            activityList.innerHTML = '<li class="list-group-item text-center text-muted">暫無活動記錄</li>';
            return;
        }
        
        activities.forEach(activity => {
            const createdDate = new Date(activity.created_at).toLocaleDateString('zh-TW');
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            listItem.innerHTML = `
                <div class="ms-2 me-auto">
                    <div class="fw-bold">${activity.title || '無標題'}</div>
                    <small class="text-muted">
                        📅 ${createdDate}
                        ${activity.proposal_path ? ' | 📎 企劃書' : ''}
                        ${activity.detail_path ? ' | 📋 相關檔案' : ''}
                    </small>
                    <div class="mt-1">
                        <small>${activity.description ? activity.description.substring(0, 100) + '...' : '無描述'}</small>
                    </div>
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewActivity(${activity.id})">
                        👁️ 查看
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editActivity(${activity.id})">
                        ✏️ 編輯
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="exportActivity(${activity.id})">
                        📤 匯出
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteActivity(${activity.id})">
                        🗑️ 刪除
                    </button>
                </div>
            `;
            
            activityList.appendChild(listItem);
        });
    } catch (error) {
        console.error('載入活動記錄失敗:', error);
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showError('載入活動記錄失敗: ' + error.message);
        } else {
            showMessage('activityMessages', '載入活動記錄失敗: ' + error.message, 'error');
        }
    }
}

// 查看會議記錄詳情
async function viewMeeting(id) {
    try {
        const response = await fetch(`/api/secretary/meetings/${id}`);
        if (!response.ok) throw new Error('無法載入會議記錄詳情');
        
        const meeting = await response.json();
        const meetingDate = new Date(meeting.date).toLocaleDateString('zh-TW');
        
        const modalContent = `
            <div class="modal fade" id="viewMeetingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">📋 ${meeting.topic || '會議記錄'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-12">
                                    <strong>📅 會議日期:</strong> ${meetingDate}
                                </div>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <strong>📝 會議內容:</strong>
                                <div class="mt-2" style="white-space: pre-wrap;">${meeting.content || '無內容'}</div>
                            </div>
                            ${meeting.filename ? `
                            <div class="mb-3">
                                <strong>📎 附件:</strong>
                                <div class="mt-2">
                                    <a href="/uploads/secretary/${meeting.filename}" target="_blank" class="btn btn-sm btn-outline-primary">📄 查看附件</a>
                                    <a href="/uploads/secretary/${meeting.filename}" download class="btn btn-sm btn-outline-success ms-2">💾 下載附件</a>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="editMeeting(${meeting.id})">✏️ 編輯</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除舊的modal
        const oldModal = document.getElementById('viewMeetingModal');
        if (oldModal) oldModal.remove();
        
        // 添加新的modal
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // 顯示modal
        const modal = new bootstrap.Modal(document.getElementById('viewMeetingModal'));
        
        // 修復 aria-hidden 問題
        const modalElement = document.getElementById('viewMeetingModal');
        modalElement.addEventListener('hidden.bs.modal', function () {
            // 確保在模態框隱藏後，移除模態框元素，避免焦點問題
            modalElement.remove();
        });
        
        modal.show();
        
    } catch (error) {
        showMessage('meetingMessages', '查看會議記錄失敗: ' + error.message, 'error');
    }
}

// 查看活動記錄詳情
async function viewActivity(id) {
    try {
        const response = await fetch(`/api/secretary/activities/${id}`);
        if (!response.ok) throw new Error('無法載入活動記錄詳情');
        
        const activity = await response.json();
        const createdDate = new Date(activity.created_at).toLocaleDateString('zh-TW');
        
        const modalContent = `
            <div class="modal fade" id="viewActivityModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🎉 ${activity.title || '無標題'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>📅 建立日期:</strong> ${createdDate}
                                </div>
                                <div class="col-md-6">
                                    <strong>👤 建立者:</strong> ${activity.created_by || 'N/A'}
                                </div>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <strong>📝 活動描述:</strong>
                                <div class="mt-2">${activity.description ? activity.description.replace(/\n/g, '<br>') : '無描述'}</div>
                            </div>
                            <div class="mb-3">
                                <strong>📎 附件:</strong>
                                <div class="mt-2">
                                    ${activity.proposal_path ? `<a href="/uploads/secretary/${activity.proposal_path}" target="_blank" class="btn btn-sm btn-outline-primary me-2">📋 企劃書</a>
                                    <a href="/uploads/secretary/${activity.proposal_path}" download class="btn btn-sm btn-outline-success me-2">💾 下載企劃書</a>` : ''}
                                    ${activity.detail_path ? `<a href="/uploads/secretary/${activity.detail_path}" target="_blank" class="btn btn-sm btn-outline-info me-2">📄 相關檔案</a>
                                    <a href="/uploads/secretary/${activity.detail_path}" download class="btn btn-sm btn-outline-success">💾 下載相關檔案</a>` : ''}
                                    ${!activity.proposal_path && !activity.detail_path ? '無附件' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="editActivity(${activity.id})">✏️ 編輯</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除舊的modal
        const oldModal = document.getElementById('viewActivityModal');
        if (oldModal) oldModal.remove();
        
        // 添加新的modal
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // 顯示modal
        const modal = new bootstrap.Modal(document.getElementById('viewActivityModal'));
        
        // 修復 aria-hidden 問題
        const modalElement = document.getElementById('viewActivityModal');
        modalElement.addEventListener('hidden.bs.modal', function () {
            // 確保在模態框隱藏後，移除模態框元素，避免焦點問題
            modalElement.remove();
        });
        
        modal.show();
        
    } catch (error) {
        showMessage('activityMessages', '查看活動記錄失敗: ' + error.message, 'error');
    }
}

// 刪除會議記錄
async function deleteMeeting(id) {
    if (!window.confirm('確定要刪除此會議記錄嗎？')) return;
    
    try {
        const response = await fetch(`/api/secretary/meetings/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('刪除失敗');
        
        showMessage('meetingMessages', '會議記錄已成功刪除');
        loadMeetings();
    } catch (error) {
        showMessage('meetingMessages', '刪除會議記錄失敗: ' + error.message, 'error');
    }
}

// 刪除活動記錄
async function deleteActivity(id) {
    if (!window.confirm('確定要刪除此活動記錄嗎？')) return;
    
    try {
        const response = await fetch(`/api/secretary/activities/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('刪除失敗');
        
        showMessage('activityMessages', '活動記錄已成功刪除');
        loadActivities();
    } catch (error) {
        showMessage('activityMessages', '刪除活動記錄失敗: ' + error.message, 'error');
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', async function() {
    // server.js的requireAuth已確保用戶已認證
    
    // 載入數據
    loadMeetings();
    loadActivities();
    
    // 會議記錄表單提交
    const meetingForm = document.getElementById('meetingForm');
    if (meetingForm) {
        meetingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(meetingForm);
            
            try {
                updateProgress('meetingProgress', 50);
                
                const response = await fetch('/api/secretary/meetings', {
                    method: 'POST',
                    body: formData
                });
                
                updateProgress('meetingProgress', 100);
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '上傳失敗');
                }
                
                showMessage('meetingMessages', '會議記錄上傳成功！');
                meetingForm.reset();
                updateProgress('meetingProgress', 0);
                loadMeetings();
                
            } catch (error) {
                showMessage('meetingMessages', '上傳失敗: ' + error.message, 'error');
                updateProgress('meetingProgress', 0);
            }
        });
    }
    
    // 活動記錄表單提交
    const activityForm = document.getElementById('activityForm');
    if (activityForm) {
        activityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(activityForm);
            
            try {
                updateProgress('activityProgress', 50);
                
                const response = await fetch('/api/secretary/activities', {
                    method: 'POST',
                    body: formData
                });
                
                updateProgress('activityProgress', 100);
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '上傳失敗');
                }
                
                showMessage('activityMessages', '活動記錄上傳成功！');
                activityForm.reset();
                updateProgress('activityProgress', 0);
                loadActivities();
                
            } catch (error) {
                showMessage('activityMessages', '上傳失敗: ' + error.message, 'error');
                updateProgress('activityProgress', 0);
            }
        });
    }
});

// 編輯會議記錄
async function editMeeting(id) {
    try {
        // 關閉查看模態框
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewMeetingModal'));
        if (viewModal) viewModal.hide();
        
        const response = await fetch(`/api/secretary/meetings/${id}`);
        if (!response.ok) throw new Error('無法載入會議記錄詳情');
        
        const meeting = await response.json();
        
        const modalContent = `
            <div class="modal fade" id="editMeetingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">✏️ 編輯會議記錄</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editMeetingForm">
                                <input type="hidden" name="id" value="${meeting.id}">
                                <div class="mb-3">
                                    <label for="editMeetingTopic" class="form-label">會議主題</label>
                                    <input type="text" class="form-control" id="editMeetingTopic" name="topic" value="${meeting.topic || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editMeetingDate" class="form-label">會議日期</label>
                                    <input type="date" class="form-control" id="editMeetingDate" name="date" value="${meeting.date ? meeting.date.split('T')[0] : ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editMeetingContent" class="form-label">會議內容</label>
                                    <textarea class="form-control" id="editMeetingContent" name="content" rows="8" required>${meeting.content || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="editMeetingFile" class="form-label">附件 (不上傳則保留原附件)</label>
                                    <input type="file" class="form-control" id="editMeetingFile" name="attachment">
                                    ${meeting.filename ? `<div class="mt-2"><small class="text-muted">當前附件: ${meeting.filename}</small></div>` : ''}
                                </div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" id="editMeetingProgress" style="width: 0%"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="updateMeeting()">💾 儲存變更</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除舊的modal
        const oldModal = document.getElementById('editMeetingModal');
        if (oldModal) oldModal.remove();
        
        // 添加新的modal
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // 顯示modal
        const modal = new bootstrap.Modal(document.getElementById('editMeetingModal'));
        
        // 修復 aria-hidden 問題
        const modalElement = document.getElementById('editMeetingModal');
        modalElement.addEventListener('hidden.bs.modal', function () {
            // 確保在模態框隱藏後，移除模態框元素，避免焦點問題
            modalElement.remove();
        });
        
        modal.show();
        
    } catch (error) {
        showMessage('meetingMessages', '編輯會議記錄失敗: ' + error.message, 'error');
    }
}

// 更新會議記錄
async function updateMeeting() {
    const form = document.getElementById('editMeetingForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const id = formData.get('id');
    
    try {
        updateProgress('editMeetingProgress', 50);
        
        const response = await fetch(`/api/secretary/meetings/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        updateProgress('editMeetingProgress', 100);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新失敗');
        }
        
        // 關閉編輯模態框
        const modal = bootstrap.Modal.getInstance(document.getElementById('editMeetingModal'));
        if (modal) modal.hide();
        
        showMessage('meetingMessages', '會議記錄更新成功！');
        loadMeetings();
        
    } catch (error) {
        showMessage('meetingMessages', '更新失敗: ' + error.message, 'error');
        updateProgress('editMeetingProgress', 0);
    }
}

// 編輯活動記錄
async function editActivity(id) {
    try {
        // 關閉查看模態框
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewActivityModal'));
        if (viewModal) viewModal.hide();
        
        const response = await fetch(`/api/secretary/activities/${id}`);
        if (!response.ok) throw new Error('無法載入活動記錄詳情');
        
        const activity = await response.json();
        
        const modalContent = `
            <div class="modal fade" id="editActivityModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">✏️ 編輯活動記錄</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="關閉"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editActivityForm">
                                <input type="hidden" name="id" value="${activity.id}">
                                <div class="mb-3">
                                    <label for="editActivityTitle" class="form-label">活動名稱</label>
                                    <input type="text" class="form-control" id="editActivityTitle" name="title" value="${activity.title || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="editActivityDescription" class="form-label">活動描述</label>
                                    <textarea class="form-control" id="editActivityDescription" name="description" rows="5" required>${activity.description || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="editActivityProposal" class="form-label">活動企劃書 (不上傳則保留原附件)</label>
                                    <input type="file" class="form-control" id="editActivityProposal" name="proposal" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                                    ${activity.proposal_path ? `<div class="mt-2"><small class="text-muted">當前企劃書: ${activity.proposal_path}</small></div>` : ''}
                                </div>
                                <div class="mb-3">
                                    <label for="editActivityDetail" class="form-label">活動相關檔案 (不上傳則保留原附件)</label>
                                    <input type="file" class="form-control" id="editActivityDetail" name="detail" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                                    ${activity.detail_path ? `<div class="mt-2"><small class="text-muted">當前相關檔案: ${activity.detail_path}</small></div>` : ''}
                                </div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" id="editActivityProgress" style="width: 0%"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="updateActivity()">💾 儲存變更</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除舊的modal
        const oldModal = document.getElementById('editActivityModal');
        if (oldModal) oldModal.remove();
        
        // 添加新的modal
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // 顯示modal
        const modal = new bootstrap.Modal(document.getElementById('editActivityModal'));
        
        // 修復 aria-hidden 問題
        const modalElement = document.getElementById('editActivityModal');
        modalElement.addEventListener('hidden.bs.modal', function () {
            // 確保在模態框隱藏後，移除模態框元素，避免焦點問題
            modalElement.remove();
        });
        
        modal.show();
        
    } catch (error) {
        showMessage('activityMessages', '編輯活動記錄失敗: ' + error.message, 'error');
    }
}

// 更新活動記錄
async function updateActivity() {
    const form = document.getElementById('editActivityForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const id = formData.get('id');
    
    try {
        updateProgress('editActivityProgress', 50);
        
        const response = await fetch(`/api/secretary/activities/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        updateProgress('editActivityProgress', 100);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新失敗');
        }
        
        // 關閉編輯模態框
        const modal = bootstrap.Modal.getInstance(document.getElementById('editActivityModal'));
        if (modal) modal.hide();
        
        showMessage('activityMessages', '活動記錄更新成功！');
        loadActivities();
        
    } catch (error) {
        showMessage('activityMessages', '更新失敗: ' + error.message, 'error');
        updateProgress('editActivityProgress', 0);
    }
}

// 匯出單個會議記錄
async function exportMeeting(id) {
    try {
        const response = await fetch(`/api/secretary/meetings/${id}`);
        if (!response.ok) throw new Error('無法載入會議記錄詳情');
        
        const meeting = await response.json();
        const meetingDate = new Date(meeting.date).toLocaleDateString('zh-TW');
        
        // 創建CSV內容
        let csvContent = '\uFEFF'; // BOM for UTF-8
        
        csvContent += '會議主題,會議日期,會議內容,附件\n';
        
        const topic = (meeting.topic || '').replace(/"/g, '""');
        const date = meetingDate;
        const content = (meeting.content || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const attachment = meeting.filename ? '有附件' : '無附件';
        csvContent += `"${topic}","${date}","${content}","${attachment}"\n`;
        
        // 創建並下載文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `會議記錄_${topic}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('meetingMessages', '會議記錄匯出成功！');
    } catch (error) {
        showMessage('meetingMessages', '匯出失敗: ' + error.message, 'error');
    }
}

// 匯出單個活動記錄
async function exportActivity(id) {
    try {
        const response = await fetch(`/api/secretary/activities/${id}`);
        if (!response.ok) throw new Error('無法載入活動記錄詳情');
        
        const activity = await response.json();
        const createdDate = new Date(activity.created_at).toLocaleDateString('zh-TW');
        
        // 創建CSV內容
        let csvContent = '\uFEFF'; // BOM for UTF-8
        
        csvContent += '活動名稱,活動描述,企劃書,相關檔案,建立日期\n';
        
        const title = (activity.title || '').replace(/"/g, '""');
        const description = (activity.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const proposal = activity.proposal_path ? '有企劃書' : '無企劃書';
        const detail = activity.detail_path ? '有相關檔案' : '無相關檔案';
        csvContent += `"${title}","${description}","${proposal}","${detail}","${createdDate}"\n`;
        
        // 創建並下載文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `活動記錄_${title}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('activityMessages', '活動記錄匯出成功！');
    } catch (error) {
        showMessage('activityMessages', '匯出失敗: ' + error.message, 'error');
    }
}

// 頁面載入時自動載入會議記錄和活動記錄列表
document.addEventListener('DOMContentLoaded', function() {
    loadMeetings();
    loadActivities();
});