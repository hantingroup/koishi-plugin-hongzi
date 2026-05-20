import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Logger, omit, Schema } from 'koishi'

export const name = 'hongzi'
export const logger = new Logger(name)

export interface Config {
  command: boolean
  interpolate: boolean
  endpoint: string
}

export const Config: Schema<Config> = Schema.object({
  command: Schema.boolean().default(true).description('启用命令。'),
  interpolate: Schema.boolean().default(true).description('启用插值。'),
  endpoint: Schema.transform(
    Schema.string().role('url'),
    url => url.replace(/\/$/, ''),
  ).default('http://pbhh.net:8426').description('字典接口地址。'),
})

export function apply(ctx: Context, config: Config) {
  async function translate(message: string, options: Record<string, string> = {}) {
    const url = `${config.endpoint}/translate`
    return await ctx.http.post<{
      translated: string
      callstack: string
    }>(url, {
      text: message,
      variables: options,
    })
  }

  config.command && ctx.command('hongzi <message:text>', '薨机的填字。')
    .option('debug', '-d 显示调用栈。')
    .action(async ({ session, options = {} }, message) => {
      if (!message.includes('[[') || !message.includes(']]'))
        return h.text(message)
      const res = await translate.call({ ctx, config }, message, omit(options, ['debug']))
      options.debug && await session?.send(res.callstack)
      return h.text(res.translated)
    })

  config.interpolate && ctx.middleware(async (session, next) => {
    if (session.content?.includes('[[') && session.content.includes(']]')) {
      const unescaped = h.unescape(session.content)
      const { translated } = await translate.call({ ctx, config }, unescaped)
      session.content = h.escape(translated)
    }
    return next()
  }, true)
}
