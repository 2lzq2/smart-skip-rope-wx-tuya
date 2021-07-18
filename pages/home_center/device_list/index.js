// miniprogram/pages/home_center/device_list/index.js.js
import wxMqtt from '../../../utils/mqtt/wxMqtt';
import { getMqttconfig } from '../../../utils/api/device-api';
import { login } from '../../../utils/request';
import { getFamilyList } from '../../../utils/api/family-api';
import { getDeviceList } from '../../../utils/api/device-api'
import { reqTicket, getClientId } from '../../../utils/api/common-api'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    active: 0,
    deviceList: [],
    baseUrl: 'plugin://tuya-ap-plugin/auto'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    const { miniProgram } = wx.getAccountInfoSync();
    wx.cloud.init({ env: `ty-${miniProgram.appId}` });
    const uid = await login()
    console.log(uid)
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'ty-service',
        data: {
          action: 'hello',
          params: {}
        }
      })

      if (!res) {
        console.log('部署SDK')
      } else {
        console.log('hello OK')
      }
    } catch (error) {
      console.log(typeof error)
    }
    try {
      const clientd
        = await wx.cloud.callFunction({
          name: 'ty-service',
          data: {
            action: 'getClientId',
            params: {}
          }
        })

      if (!clientd) {
        console.log('部署授权文件')
      } else {
        console.log('getclientid OK')
      }
    } catch (error) {
      console.log(error)
    }
    
    try {    
      // wx.setStorageSync('vir_device', device_id);
      let {
        client_id,
        password,
        source_topic: { device: topic },
        url,
        username
      } = await getMqttconfig();

      wxMqtt.connectMqtt(url, { clientId: client_id, username, password, subscribeTopics: topic });
    } catch (error) {
      // wx.showModal({
      //   title: '检测到未部署SDK',
      //   content: '后续功能操作都需要SDK能力, 请去涂鸦开发平台程序一键部署SDK'
      // })
      console.log(error)
    }
    const homeList = await getFamilyList();
    wx.setStorageSync('owner_id', homeList[0].home_id)
    console.log(homeList[0].home_id)
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: async function () {
    const deviceList = await getDeviceList()
    deviceList.forEach(item => {
      item.icon = `https://images.tuyacn.com/${item.icon}`
    })
    console.log('deviceList',deviceList)
    this.setData({ deviceList })
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  jumpToPanel({currentTarget}) {
    console.log('currentTarget',currentTarget)
    const { dataset: { device } } = currentTarget
    const { id, category, name } = device
    switch (category) {
      case 'kg': break;
      case 'ts': 
      wx.navigateTo({
        url: `/pages/ts/index?device_id=${id}&device_name=${name}`,
      })
        break
      default: {
        wx.navigateTo({
          url: `/pages/home_center/common_panel/index?device_id=${id}&device_name=${name}`,
        })
      }
    }
  },

  // 跳转配网插件
  gotoPluginPage: async function () {
    const { baseUrl } = this.data;
    const [{ ticket }, clientId] = await Promise.all([reqTicket(), getClientId()])
    console.log(baseUrl);
    const home_id = wx.getStorageSync('owner_id')
    wx.navigateTo({
      url: `${baseUrl}?ticket=${ticket}&clientId=${clientId}&gid=${home_id}`,
    })
  }
})