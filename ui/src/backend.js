
const BASEURL = "http://localhost:48739"

export default class backend {
  const get = async (url) => {
    return fetch(`${BASEURL}${url}`).then(res => res.json())
  }
}