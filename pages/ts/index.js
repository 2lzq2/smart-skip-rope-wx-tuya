import { getDeviceDetails } from '../../utils/api/device-api';
import { getFamilyList } from '../../utils/api/family-api';
import BleService from '../../libs/ble-server';
import request from '../../utils/request';
import { dpIdMap } from '../../utils/ts_utils/config';
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast';

const BleConnectStatus = {
  notConnected: '未连接',
  connecting: '连接中',
  connected: '已连接',
  connectionFailed: '连接失败'
};

const BleConnectColor = {
  notConnected: '#FF0000',
  connecting: '#00FFFF',
  connected: '#0DB178',
  connectionFailed: '#FF0000'
};

const ButtonColor = {
  continue: '#0DB178',
  pause: '#F5B301'
};

const ButtonMode = {
  start: 0,
  pause: 1,
  continue: 2,
  stop: 3
};

const ButtonText = {
  start: '开始',
  pause: '暂停',
  continue: '继续',
  stop: '停止'
};

const PageMode = {
  modeSelect: 0,
  trainStart: 1,
  trainFinish: 2
};

const TrainMode = {
  freeTrain: 0,
  cntTrain: 1,
  timeTrain: 2,
};

// 注入方法
BleService.initFunction(request);

Page({
  /**
   * 页面的初始数据
   */
  data: {
    device_name: '',
    bleInstance: null,
    bleConnectStatus: BleConnectStatus.notConnected,
    bleTextColor: BleConnectColor.notConnected,
    dpState: {},
    bleConnect: false,
    device_id: '',
    lastCnt: 0,
    lastTime: '--',
    lastSpeed: '--',

    nowCnt: 0,
    nowTime: 0,
    nowSpeed: 0,
    circlePercent: 0,
    valueOne: 0,
    valueTwo: 0,
    valueThr: 0,
    textOne: '',
    textTwo: '',
    textThr: '',
    targetValue: '',

    bluShow: false,
    pageMode: PageMode.modeSelect,
    trainMode: TrainMode.freeTrain,

    buttonColor: ButtonColor.continue,
    buttonText: '开始',
    buttonWidth: '46rpx',
    buttonMode: ButtonMode.start,

    popCntShow: false,
    popTimeShow: false,

    popCntValue: 300,
    popTimeValue: [],
  },

  touchStartTime: 0,
  tapTimerId: null,
  lastButtonMode: -1,
  trainValue: 0,
  isFirstConnect: true,
  finalCnt: 0,
  finalTime: 0,
  finalSpeen: 0,

  jumpTodeviceEditPage() {
    const { icon, device_id, device_name } = this.data;
    wx.navigateTo({
      url: `/pages/home_center/device_manage/index?device_id=${device_id}&device_name=${device_name}&device_icon=${icon}`
    });
  },

  blueRecvCallback(parseReceiveData) {
    const { type, status, dpState, deviceId} = parseReceiveData;
    console.log(parseReceiveData);
    console.log(dpState);
    if (type === 'connect' && status === 'fail') {
      if (deviceId) {
        if(this.isFirstConnect) {
          this.isFirstConnect = false;
          setTimeout(this.connectBlue, 50);
        } else {
          Toast.fail('连接失败 或 连接后又断开');
          this.setData({
            bleConnectStatus: BleConnectStatus.connectionFailed,
            bleTextColor: BleConnectColor.connectionFailed,
            bleConnect: false,
            bluShow: true,
          });
        }
      } else {
        Toast.fail('未发现当前蓝牙设备');
        this.setData({
          bleConnectStatus: BleConnectStatus.connectionFailed,
          bleTextColor: BleConnectColor.connectionFailed,
          bleConnect: false,
          bluShow: true,
        });
      }
    } else if (type === 'connect' && status === 'connecting') {
       //连接中，就是老是停在这个状态不动
       Toast.loading({
         duration: 0, // 持续展示 toast
         message: '蓝牙连接中...',
       });
    } else if (type === 'connect' && status === 'connected') {
      // 连接成功
      Toast.success('蓝牙连接成功');
      this.isFirstConnect = false;
      this.setData({
        bleConnectStatus: BleConnectStatus.connected,
        bleTextColor: BleConnectColor.connected,
        bleConnect: true,
      });
    } else if (!(deviceId in parseReceiveData)) {
      // 一般为dp上报事件，可在此处处理数据or走业务逻辑
      if(this.data.trainMode == TrainMode.freeTrain) {
        if('count_realtime' in dpState) {
          this.setData({
            nowCnt: dpState.count_realtime,
            valueOne: dpState.count_realtime,
          });
        }
        if('time_realtime' in dpState) {
          this.setData({
            nowTime: dpState.time_realtime,
            valueTwo: this.getTimeStr(dpState.time_realtime),
          });
        }
        if('speed_realtime' in dpState) {
          this.setData({
            nowSpeed: dpState.speed_realtime,
            valueThr: dpState.speed_realtime,
          });
        }
      } else if(this.data.trainMode == TrainMode.cntTrain) {
        if('target_count' in dpState) {
          this.setData({
            valueOne: dpState.target_count,
          });
        }
        if('time_realtime' in dpState) {
          this.setData({
            nowTime: dpState.time_realtime,
            valueTwo: this.getTimeStr(dpState.time_realtime),
          });
        }
        if('speed_realtime' in dpState) {
          this.setData({
            nowSpeed: dpState.speed_realtime,
            valueThr: dpState.speed_realtime,
          });
        }
        if('count_realtime' in dpState) {
          this.setData({
            nowCnt: dpState.count_realtime,
            valueOne: dpState.count_realtime,
            circlePercent: Math.round((this.trainValue - dpState.count_realtime)*100/this.trainValue),
          });
          if(dpState.count_realtime == 0 && this.data.pageMode == PageMode.trainStart) {
            this.finalCnt = this.data.nowCnt;
            this.finalSpeed = this.data.nowSpeed;
            this.finalTime = this.data.nowTime;
            this.showTrainFinish();
          }
        }
      } else {
        if('target_time' in dpState) {
          this.setData({
            valueOne: this.getTimeStr(dpState.target_time),
          });
        }
        if('count_realtime' in dpState) {
          this.setData({
            nowCnt: dpState.count_realtime,
            valueTwo: dpState.count_realtime,
          });
        }
        if('speed_realtime' in dpState) {
          this.setData({
            nowSpeed: dpState.speed_realtime,
            valueThr: dpState.speed_realtime,
          });
        }
        if('time_realtime' in dpState) {
          this.setData({
            nowTime: dpState.time_realtime,
            valueOne: this.getTimeStr(dpState.time_realtime),
            circlePercent: Math.round((this.trainValue - dpState.time_realtime)*100/this.trainValue),
          });
          if(dpState.time_realtime == 0 && this.data.pageMode == PageMode.trainStart) {
            this.finalCnt = this.data.nowCnt;
            this.finalSpeed = this.data.nowSpeed;
            this.finalTime = this.data.nowTime;
            this.showTrainFinish();
          }
        }
      }
    }
  },
  // 生命周期函数--监听页面加载
  onLoad: async function(options) {
    const { device_id } = options
    const { name, icon } = await getDeviceDetails(device_id)

    var minValues = [];
    var secValues = [];
    for(var i=0; i<60; i++)
    {
      minValues[i] = `${i}分`;
      secValues[i] = `${i}秒`;
    }

    // 指令下发
    this.setData({
      device_name: name,
      icon,
      device_id,
      popTimeValue: [
        {
          values: minValues,
          defaultIndex: 5
        },
        {
          values: secValues,
          defaultIndex: 0
        }
      ],
    });

    this.connectBlue();
  },
  // 生命周期函数--监听页面卸载,销毁蓝牙实例
  onUnload: function () {
    const { device_id } = this.data;
    BleService.destroyInstance(device_id);
  },
  // 下发指令，设置本次跳绳目标为？？次（该dp点下发前需先下发工作模式给到设备，否则下发失败，详见readme文档）
  sendCount: function() {
    console.log('cnt'+this.trainValue);
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'target_count', dpValue: this.trainValue });
    }
  },
  // 下发指令，设置本次跳绳目标为？？秒（该dp点下发前需先下发工作模式给到设备，否则下发失败，详见readme文档）
  sendTime: function() {
    console.log('time'+this.trainValue);
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'target_time', dpValue: this.trainValue });
    }
  },
  // 下发指令，设置本次跳绳模式为 倒计数 模式
  sendModeCnt: function() {
    console.log('modecnt');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'mode', dpValue: 'countdown_number' });
    }
  },
  // 下发指令，设置本次跳绳模式为 倒计时 模式
  sendModeTime: function() {
    console.log('modetime');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'mode', dpValue: 'countdown_time' });
    }
  },
  // 下发指令，设置本次跳绳模式为 自由跳 模式
  sendModeFree: function() {
    console.log('modefree');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'mode', dpValue: 'free_jump' });
    }
  },
  // 下发指令，开始
  sendTrainStart: function() {
    console.log('start');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'start', dpValue: true });
      bleInstance.sendDp({ dpCode: 'pause', dpValue: false });
    }
  },
  // 下发指令，结束
  sendTrainStop: function() {
    console.log('stop');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'pause', dpValue: false });
      bleInstance.sendDp({ dpCode: 'start', dpValue: false });
    }
  },
  // 下发指令，暂停
  sendTrainPause: function() {
    console.log('pause');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'pause', dpValue: true });
    }
  },
  // 下发指令，继续
  sendTrainGo: function() {
    console.log('go');
    const { bleInstance, bleConnect } = this.data;
    if (bleInstance && bleConnect) {
      bleInstance.sendDp({ dpCode: 'pause', dpValue: false });
    }
  },
  // 蓝牙连接
  connectBlue: function() {
    var { bleInstance } = this.data;
    if(!bleInstance || bleInstance._listeners.length == 0)
    {
      const { device_id } = this.data;
      const owner_id = wx.getStorageSync('owner_id');
      bleInstance = BleService.setNewInstance(device_id, owner_id);
      bleInstance.set('_bleIotData', { _ble_dpCodeMap: dpIdMap });
      bleInstance.revicePackage(this.blueRecvCallback);
      this.setData({
        bleInstance
      });
    }

    Toast.loading({
      duration: 0, // 持续展示 toast
      message: '正在连接...',
    });

    this.setData({
      bluShow: false,
      bleConnectStatus: BleConnectStatus.connecting,
      bleTextColor: BleConnectColor.connecting,
    })
    bleInstance.connectBlue();
  },
  //进入自由训练页面
  toFreeShow: function() {
    this.setData({
      nowCnt: 0,
      nowTime: 0,
      nowSpeed: 0,
      valueOne: 0,
      valueTwo: '00:00',
      valueThr: 0,
      textOne: '个',
      textTwo: '时间',
      textThr: '速度',
      circlePercent: 0,
      targetValue: '',
      pageMode: PageMode.trainStart,
      trainMode: TrainMode.freeTrain,
      buttonColor: ButtonColor.continue,
      buttonText: '开始',
      buttonWidth: '46rpx',
      buttonMode: ButtonMode.start,
    });
    this.sendModeFree();
  },
  //进入计数训练页面
  toCntShow: function() {
    this.setData({
      nowCnt: 0,
      nowTime: 0,
      nowSpeed: 0,
      valueOne: 0,
      valueTwo: '00:00',
      valueThr: 0,
      textOne: '个',
      textTwo: '时间',
      textThr: '速度',
      circlePercent: 0,
      targetValue: '设定数量 0',
      pageMode: PageMode.trainStart,
      trainMode: TrainMode.cntTrain,
      buttonColor: ButtonColor.continue,
      buttonText: '开始',
      buttonWidth: '46rpx',
      buttonMode: ButtonMode.start,
      popCntShow: true,
    });
    this.sendModeCnt();
  },
  //进入计时训练页面
  toTimeShow: function() {
    this.setData({
      nowCnt: 0,
      nowTime: 0,
      nowSpeed: 0,
      valueOne: '00:00',
      valueTwo: 0,
      valueThr: 0,
      textOne: '个',
      textTwo: '数量',
      textThr: '速度',
      circlePercent: 0,
      targetValue: '设定时间 00:00',
      pageMode: PageMode.trainStart,
      trainMode: TrainMode.timeTrain,
      buttonColor: ButtonColor.continue,
      buttonText: '开始',
      buttonWidth: '46rpx',
      buttonMode: ButtonMode.start,
      popTimeShow: true,
    });
    this.sendModeTime();
  },
  //回到模式选择页面
  toModeShow: function() {
    var pageMode = PageMode.modeSelect;
    this.setData({
      pageMode
    });
    this.sendTrainStop();
  },

  btnTouchStart: function(e) {
    if(this.tapTimerId != null) {
      clearInterval(this.tapTimerId);
      this.tapTimerId = null;
    }
    this.touchStartTime = new Date().getTime();
    this.lastButtonMode = -1;
    this.tapTimerId = setInterval(function(that) {
      var { buttonMode, buttonText, buttonWidth } = that.data;
      if(buttonMode != ButtonMode.start) {
        var timeDif = new Date().getTime() - that.touchStartTime;
        if( timeDif >= 350)
        {
          timeDif -= 350;
          var newwidth = timeDif*(500-46)/1000+46;
          if(that.lastButtonMode < 0) {
            that.lastButtonMode = buttonMode;
          }
          buttonMode = ButtonMode.stop;
          if(newwidth >= 500) {
            buttonWidth = 500+'rpx';
            buttonText = ButtonText.stop;
          } else {
            buttonWidth = newwidth+'rpx';
          }
          that.setData({
            buttonMode,
            buttonText,
            buttonWidth,
          });
        }
      }
    }, 20, this);
  },
  btnTouchEnd: function(e) {
    if(this.tapTimerId != null) {
      clearInterval(this.tapTimerId);
      this.tapTimerId = null;
    }
    var { buttonMode, buttonText, buttonColor } = this.data;
    if( buttonMode == ButtonMode.start) {
      const toast = Toast.loading({
        duration: 0, // 持续展示 toast
        forbidClick: true,
        message: '倒计时 3 秒',
        mask: true,
      });
      let second = 3;
      const timer = setInterval((that) => {
        second--;
        if (second) {
          toast.setData({
            message: `倒计时 ${second} 秒`,
          });
        } else {
          clearInterval(timer);
          Toast.clear();
          var { buttonMode, buttonText, buttonColor } = that.data;
          buttonMode = ButtonMode.pause;
          buttonText = ButtonText.pause;
          buttonColor = ButtonColor.pause;
          that.setData({
            buttonMode,
            buttonText,
            buttonColor,
          });
          that.sendTrainStart();
        }
      }, 1000, this);
    }else if(buttonMode == ButtonMode.continue) {
        buttonMode = ButtonMode.pause;
        buttonText = ButtonText.pause;
        buttonColor = ButtonColor.pause;
        this.sendTrainGo();
    }else if(buttonMode == ButtonMode.pause) {
        buttonMode = ButtonMode.continue;
        buttonText = ButtonText.continue;
        buttonColor = ButtonColor.continue;
        this.sendTrainPause();
    }else {
      if(buttonText == ButtonText.stop) {
        this.finalCnt = this.data.nowCnt;
        this.finalSpeed = this.data.nowSpeed;
        this.finalTime = this.data.nowTime;
        this.sendTrainStop();
        this.showTrainFinish();
      } else {
        buttonMode = this.lastButtonMode;
      }
    }
    this.setData({
      buttonMode,
      buttonText,
      buttonColor
    });
  },
  finishReturn: function() {
      var pageMode = PageMode.modeSelect;
      this.sendTrainStop();
      this.setData({
        pageMode,
      });
  },
  changeTargetValue: function() {
    if(this.data.buttonMode == ButtonMode.start) {
      if(this.data.trainMode == TrainMode.timeTrain)
      {
        var popTimeShow = true;
        this.setData({
          popTimeShow,
        });
      } else if(this.data.trainMode == TrainMode.cntTrain)
      {
        var popCntShow = true;
        this.setData({
          popCntShow,
        });
      }
    }
  },
  popCntClose: function() {
    var popCntShow = false;
    this.setData({
      popCntShow,
    });
  },
  popCntChange: function(event) {
    var popCntValue = event.detail;
    this.setData({
      popCntValue,
    });
  },
  popCntConfirm: function(event) {
    this.trainValue = Number(this.data.popCntValue);
    this.setData({
      targetValue: `设定数量 ${this.data.popCntValue}`,
      popCntShow: false,
    });
    this.sendCount();
  },
  popTimeClose: function() {
    var popTimeShow = false;
    this.setData({
      popTimeShow,
    });
  },
  popTimeCancel: function() {
    var popTimeShow = false;
    this.setData({
      popTimeShow,
    });
  },
  popTimeConfirm: function(event) {
    var value = Number(event.detail.index[0]*60 + event.detail.index[1]);
    this.trainValue = value;
    var timeStr = this.getTimeStr(value);
    this.setData({
      targetValue: `设定时间 ${timeStr}`,
      popTimeShow: false,
    });
    this.sendTime();
  },
  getTimeStr: function(timeValue) {
    var min = parseInt(timeValue/60);
    var sec = timeValue%60;
    if(min < 10) {
      min = '0'+min;
    }
    if(sec < 10) {
      sec = '0'+sec;
    }
    return min+':'+sec;
  },
  showTrainFinish: function() {
    if(this.data.trainMode == TrainMode.freeTrain) {
      this.setData({
        lastCnt: this.finalCnt,
        lastTime: this.getTimeStr(this.finalTime),
        lastSpeed: this.finalSpeed,
        pageMode: PageMode.trainFinish,
      });
    } else if(this.data.trainMode == TrainMode.cntTrain) {
      this.setData({
        lastCnt: this.trainValue - this.finalCnt,
        lastTime: this.getTimeStr(this.finalTime),
        lastSpeed: this.finalSpeed,
        pageMode: PageMode.trainFinish,
      });
    } else {
      this.setData({
        lastCnt: this.finalCnt,
        lastTime: this.getTimeStr(this.trainValue - this.finalTime),
        lastSpeed: this.finalSpeed,
        pageMode: PageMode.trainFinish,
      });
    }
  },
});