import { redirect } from 'next/navigation';

/**
 * 根路径：后台入口统一为 /dashboard。
 * 未登录时由 middleware 在跳转途中拦截进入 /login。
 */
export default function RootPage() {
  redirect('/dashboard');
}
