import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
/* @ts-ignore */
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
/* @ts-ignore */
import { URLSearchParams } from 'https://jslib.k6.io/url/1.0.0/index.js'

const url = __ENV.BASE_URL;

const boardName = `Board-${randomIntBetween(1, 1000)}`;

let boardId;

const createBoardTrend = new Trend('create_board', true);
const getBoardTrend = new Trend('get_board', true);
const updateBoardTrend = new Trend('update_board', true);
const deleteBoardTrend = new Trend('delete_board', true);

export const options = {
  stages: [
    { duration: "5s", target: 5 },
    { duration: "10s", target: 5 },
    { duration: "5s", target: 0 }
  ],
  thresholds: {
    'create_board': ['med<350', 'p(95)<500'],
    'get_board': ['med<100', 'p(95)<250'],
    'update_board': ['med<250', 'p(95)<450'],
    'delete_board': ['med<1200', 'p(95)<1500']
  },
  ext: {
    loadimpact: {
      projectId: __ENV.PROJECT_ID
    }
  }
};

export const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `OAuth oauth_consumer_key="${__ENV.KEY}", oauth_token="${__ENV.TOKEN}"`
  }
};

export default () => {
  group('Board Functionality', () => { 
    const body = JSON.stringify({
      name: boardName,
      prefs_permissionLevel: 'public',
      prefs_background: 'green'
    });
    const createBoard = http.post(url, body, params);
    createBoardTrend.add(createBoard.timings.duration);
    check(createBoard, {
      'Status is 200': (r) => r.status === 200,
      'Board Name': (r) => r.json('name') === boardName,
      'Permission Level': (r) => r.json('prefs.permissionLevel') === 'public',
      'Background color': (r) => r.json('prefs.background') === 'green'
    });
    boardId = createBoard.json('id');

    const getBoard = http.get(`${url}/${boardId}`);
    getBoardTrend.add(getBoard.timings.duration);
    check(getBoard, {
      'Status is 200': (r) => r.status === 200
    });

    const updateParams = new URLSearchParams([
      ['desc', 'Agile Board'],
      ['closed', true]
    ]); 
    const updateBoard = http.put(`${url}/${boardId}?${updateParams.toString()}`, undefined, params);
    updateBoardTrend.add(updateBoard.timings.duration);
    check(updateBoard, {
      'Status is 200': (r) => r.status === 200,
      'Board Description': (r) => r.json('desc') === 'Agile Board',
      'Closed': (r) => r.json('closed') === true
    });

    const deleteBoard = http.del(`${url}/${boardId}`, undefined, params);
    deleteBoardTrend.add(deleteBoard.timings.duration);
    check(deleteBoard, {
      'Status is 200': (r) => r.status === 200
    });
  });

  sleep(randomIntBetween(1, 3));
}