if (!('browser' in self)) {
  self.browser = self.chrome
}

const extensionSyncStorage = browser.storage.sync
const extensionLocalStorage = browser.storage.local
const extensionStorage = extensionSyncStorage

function createAnchorElement(url) {
	const l = document.createElement("a")
	l.href = url
	return l
}

main()

async function main() {
	const { prefixHttpOnly } = await extensionStorage.get('prefixHttpOnly')
	$('#prefix-httponly-checkbox').prop('checked', prefixHttpOnly || false)

	const queryResult = await browser.tabs.query({
		currentWindow: true,
		active: true
	})

	const activeTabInfo = queryResult[0]

	if (activeTabInfo) {
		const urlAnchor = createAnchorElement(activeTabInfo.url)

		if (/^https?:$/.test(urlAnchor.protocol)) {
			const currentTabHostname = urlAnchor.hostname

			$('#save-for-current-hostname-button').html(currentTabHostname)

			$('#save-for-current-hostname-button').on('click', async () => {
				const cookies = await browser.cookies.getAll(getAllDetails({ domain: currentTabHostname }))
				await saveCookiesToTextFile(cookies, `cookies-${currentTabHostname.replace(/\./g, '-')}.txt`, shouldPrefixHttpOnly())
			})

			const parsedDomain = psl.parse(currentTabHostname)

			if (parsedDomain && parsedDomain.subdomain) {
				const currentTabDomain = parsedDomain.domain
				$('#save-for-current-domain-button').html(currentTabDomain)

				$('#save-for-current-domain-button').on('click', async () => {
					const cookies = await browser.cookies.getAll(getAllDetails({ domain: currentTabDomain }))
					await saveCookiesToTextFile(cookies, `cookies-${currentTabDomain.replace(/\./g, '-')}.txt`, shouldPrefixHttpOnly())
				})
			} else {
				$('#save-for-current-domain-button').css('display', 'none')
			}
		} else {
			$('#save-for-current-hostname-button').css('display', 'none')
			$('#save-for-current-domain-button').css('display', 'none')
		}
	} else {
		$('#save-for-current-hostname-button').css('display', 'none')
		$('#save-for-current-domain-button').css('display', 'none')
	}


	$('#save-for-all-domains-button').on('click', async () => {
		const allCookies = await browser.cookies.getAll(getAllDetails())
		await saveCookiesToTextFile(allCookies, `cookies.txt`, shouldPrefixHttpOnly())
	})

	$('#prefix-httponly-checkbox').on('change input', async () => {
		await extensionStorage.set({ prefixHttpOnly: shouldPrefixHttpOnly()})
	})

	function shouldPrefixHttpOnly() {
		return $('#prefix-httponly-checkbox').prop('checked')
	}
}

async function saveCookiesToTextFile(cookieDescriptors, filename, prefixHttpOnly) {
	const formattedCookies = cookieDescriptors.map((c) => formatCookie(c, prefixHttpOnly))
	const fileContent = `# Netscape HTTP Cookie File\n\n${formattedCookies.join('\n')}\n`
	const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
	saveAs(blob, filename)
}

function getAllDetails({ domain = null } = {}) {
	const result = {}

	if (domain !== null) {
		result.domain = domain
	}

	if (Object.hasOwnProperty.call(window, 'chrome') === true) {
		return result
	}

	result.firstPartyDomain = null
	return result
}

function formatCookie(c, prefixHttpOnly) {
	return [
		`${prefixHttpOnly && c.httpOnly ? '#HttpOnly_' : ''}${(!c.hostOnly && c.domain && !c.domain.startsWith('.')) ? '.' : ''}${c.domain}`,
		c.hostOnly ? 'FALSE' : 'TRUE',
		c.path,
		c.secure ? 'TRUE' : 'FALSE',
		c.session || !c.expirationDate ? 0 : parseInt(c.expirationDate),
		c.name,
		c.value
	].join('\t')
}
