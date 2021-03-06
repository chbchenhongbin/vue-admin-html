import router from './router'
import store from './store'
import NProgress from 'nprogress' // Progress 进度条
import 'nprogress/nprogress.css'// Progress 进度条样式
import { getInfo } from './utils/auth' // 验权
import { Message } from 'element-ui'

// permissiom judge
function hasRole (authRules, permissionAuthRules) {
    if (!authRules || authRules.length <= 0) {
        return false
    }
    if (authRules.indexOf('admin') >= 0) return true // admin权限 直接通过
    if (!permissionAuthRules) return true
    return authRules.some(role => permissionAuthRules.indexOf(role) >= 0)
}
// console.log(store.getters.routers)

// register global progress.
const whiteList = ['/login', '/authredirect']// 不重定向白名单
router.beforeEach((to, from, next) => {
    NProgress.start() // 开启Progress
    if (getInfo().id) { // 判断是否有token
        if (to.path === '/login') {
            next({path: '/'})
            NProgress.done() // router在hash模式下 手动改变hash 重定向回来 不会触发afterEach 暂时hack方案 ps：history模式下无问题，可删除该行！
        } else {
            if (!store.getters.userName && (!store.getters.authRules || store.getters.authRules.length === 0)) { // 判断当前用户是否已拉取完用户信息
                store.dispatch('userInfo').then(res => { // 拉取user_info
                    const authRules = res.authRules || []
                    if (!(authRules instanceof Array) || authRules.length === 0) {
                        Message.error('权限验证失败，请联系管理员~')
                        store.dispatch('loginOut').then(() => {
                            next('/login')
                        })
                        NProgress.done()
                    }
                    store.dispatch('filterRouter', {authRules}).then(() => { // 生成可访问的路由表
                        router.addRoutes(store.getters.addRouters) // 动态添加可访问路由表
                        next({...to}) // hack方法 确保addRoutes已完成
                    })
                }).catch(() => {
                    store.dispatch('fedLogout').then(() => {
                        Message.error('验证失败,请重新登录')
                        next({path: '/login'})
                    })
                })
            } else {
                // 没有动态改变权限的需求可直接next() 删除下方权限判断 ↓
                if (hasRole(store.getters.authRules, to.meta.authRule)) {
                    next()//
                } else {
                    next({
                        path: '/401',
                        query: {noGoBack: true}
                    })
                    NProgress.done() // router在hash模式下 手动改变hash 重定向回来 不会触发afterEach 暂时hack方案 ps：history模式下无问题，可删除该行！
                }
                // 可删 ↑
            }
        }
    } else {
        if (whiteList.indexOf(to.path) !== -1) { // 在免登录白名单，直接进入
            next()
        } else {
            next('/login') // 否则全部重定向到登录页
            NProgress.done() // router在hash模式下 手动改变hash 重定向回来 不会触发afterEach 暂时hack方案 ps：history模式下无问题，可删除该行！
        }
    }
})

router.afterEach(() => {
    NProgress.done() // 结束Progress
})
