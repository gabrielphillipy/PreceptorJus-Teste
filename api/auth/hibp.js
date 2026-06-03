// api/auth/hibp.js — Proxy k-anonymity para HaveIBeenPwned (R2)
// O cliente envia apenas os 5 primeiros caracteres do hash SHA-1.
// Este servidor busca os suffixes correspondentes e retorna ao cliente.
// A senha nunca é enviada ao servidor — permanece no browser.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prefix } = req.body ?? {}

  if (typeof prefix !== 'string' || !/^[A-Fa-f0-9]{5}$/.test(prefix)) {
    return res.status(400).json({ error: 'Prefix inválido' })
  }

  try {
    const hibpRes = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`,
      {
        headers: {
          'Add-Padding': 'true', // padding k-anonymity para impedir correlação de tráfego
          'User-Agent': 'PreceptorJus/1.0',
        },
      },
    )
    if (!hibpRes.ok) {
      return res.status(502).json({ error: 'HIBP indisponível' })
    }
    const text = await hibpRes.text()
    const hashes = text
      .split('\n')
      .map((l) => l.split(':')[0])
      .filter(Boolean)

    // Cache de 24h (os hashes raramente mudam)
    res.setHeader('Cache-Control', 'private, max-age=86400')
    return res.status(200).json({ hashes })
  } catch (err) {
    console.error('[hibp]', err)
    return res.status(502).json({ error: 'Erro ao verificar senha' })
  }
}
