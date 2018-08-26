import axios from 'axios'
import * as tough from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { JSDOM } from 'jsdom';
import * as querystring from 'querystring';

const config = {
  username: process.env.MILI_USERNAME || null,
  password: process.env.MILI_PASSWORD || null
}

async function main () {
  const text = await (() => new Promise(resolve => {
    const chunks: Array<String|Buffer> = []

    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read()
      if (chunk !== null) chunks.push(chunk)
    })

    process.stdin.on('end', () => {
      return resolve(chunks.join())
    })
  }))() as string

  const jar = new tough.CookieJar()
  axiosCookieJarSupport(axios)
  const { data } = await axios.get('https://misskey.link', {
    jar,
    withCredentials: true
  })
  const { window: { document } } = new JSDOM(data)
  const token = document.querySelector('meta[name="csrf-token"]')
  if (!token) {
    throw new Error()
  }
  const csrfToken = token.getAttribute('content')

  const form = querystring.stringify({
    'screen-name': config.username,
    'password': config.password
  })

  const a = await axios.post('https://login.misskey.link/', form, {
    jar,
    headers: {
      'csrf-token': csrfToken,
      'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
    },
    withCredentials: true
  })

  const c = await axios.post('https://himasaku.misskey.link/posts/create',
    querystring.stringify({
      files: null,
      text
    }),
    {
      jar,
      headers: {
        'csrf-token': csrfToken,
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
      },
      withCredentials: true
    }
  )

  console.log(c.data.id)

  await axios.get('https://logout.misskey.link/', {
    jar,
    withCredentials: true
  })
}

main().catch(e => console.error(e))
