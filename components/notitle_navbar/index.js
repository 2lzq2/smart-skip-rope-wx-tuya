// components/t_navbar/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
  },

  /**
   * 组件的初始数据
   */
  data: {
    marginTop: '20px',
    height: 'auto',
  },

  lifetimes: {
    attached: function () {
      const { statusBarHeight, system } = wx.getSystemInfoSync();
      const height = system.indexOf('iOS') > -1 ? '44px' : '48px'
      this.setData({ height, marginTop: `${statusBarHeight}px` })
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    backPage: function () {
      this.triggerEvent('back');
    }
  }
})
