import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  metadataBase: new URL('https://docs.hostfi.ai'),
  title: {
    template: '%s – HostFi Docs'
  },
  description: 'Documentation for HostFi — AI-powered expense management for short-term rental hosts.',
  applicationName: 'HostFi Docs',
}

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <b style={{ fontSize: '1.1rem' }}>HostFi</b>
          <span style={{ opacity: '60%', fontSize: '0.9rem' }}>Docs</span>
        </div>
      }
      projectLink="https://hostfi.ai"
    />
  )
  const pageMap = await getPageMap()
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="🏠" />
      <body>
        <Layout
          navbar={navbar}
          footer={<Footer>© {new Date().getFullYear()} HostFi. All rights reserved. <a href="https://hostfi.ai" style={{ color: '#14b8a6' }}>hostfi.ai</a></Footer>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
