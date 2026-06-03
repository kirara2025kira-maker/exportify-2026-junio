import './App.scss'
import "./icons"
import React, { useState, useEffect } from 'react'
import { useTranslation, Translation } from "react-i18next"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import "url-search-params-polyfill"
import Login from 'components/Login'
import PlaylistTable from "components/PlaylistTable"
import { getQueryParam } from "helpers"
import TopMenu from "components/TopMenu"

function App() {
  useTranslation()
  const [subtitle, setSubtitle] = useState(<Translation>{(t) => t("tagline")}</Translation>)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  let view
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')

  const onSetSubtitle = (subtitle: any) => {
    setSubtitle(subtitle)
  }

  // Manejar el intercambio de código por token (PKCE)
  useEffect(() => {
    const exchangeCodeForToken = async () => {
      if (code) {
        const codeVerifier = localStorage.getItem('code_verifier')
        
        if (codeVerifier) {
          try {
            // ?? IMPORTANTE: Usar la misma redirect_uri que en Login.tsx
            const redirectUri = window.location.origin + window.location.pathname;
            
            // Intercambiar el código por un access_token
            const response = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: '2c8e4d6d067648c4a95095f20b508cc6',
                code_verifier: codeVerifier,
              }),
            })

            const data = await response.json()
            
            if (data.access_token) {
              // Guardar el token y limpiar la URL
              setAccessToken(data.access_token)
              localStorage.removeItem('code_verifier')
              
              // Limpiar el parámetro 'code' de la URL sin recargar
              const newUrl = window.location.origin + window.location.pathname
              window.history.replaceState({}, document.title, newUrl)
            } else if (data.error) {
              console.error('Error from Spotify:', data.error, data.error_description)
              // Si hay error, limpiar y mostrar mensaje
              localStorage.removeItem('code_verifier')
            }
          } catch (error) {
            console.error('Error exchanging code for token:', error)
          }
        } else {
          console.error('No code_verifier found in localStorage')
        }
      }
      setIsLoading(false)
    }

    // Verificar si hay un access_token en el hash (para compatibilidad)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const legacyToken = hashParams.get('access_token')
    
    if (legacyToken) {
      setAccessToken(legacyToken)
      setIsLoading(false)
      // Limpiar el hash de la URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (code) {
      exchangeCodeForToken()
    } else {
      setIsLoading(false)
    }
  }, [code])

  if (getQueryParam('spotify_error') !== '') {
    view = <div id="spotifyErrorMessage" className="lead">
      <p><FontAwesomeIcon icon={['fas', 'bolt']} style={{ fontSize: "50px", marginBottom: "20px" }} /></p>
      <p>Oops, Exportify has encountered an unexpected error (5XX) while using the Spotify API. This kind of error is due to a problem on Spotify's side, and although it's rare, unfortunately all we can do is retry later.</p>
      <p style={{ marginTop: "50px" }}>Keep an eye on the <a target="_blank" rel="noreferrer" href="https://status.spotify.dev/">Spotify Web API Status page</a> to see if there are any known problems right now, and then <a rel="noreferrer" href="?">retry</a>.</p>
    </div>
  } else if (isLoading) {
    // Mostrar estado de carga mientras se intercambia el código
    view = <div className="text-center">
      <p><FontAwesomeIcon icon={['fas', 'spinner']} spin /> Loading...</p>
    </div>
  } else if (accessToken) {
    view = <PlaylistTable accessToken={accessToken} onSetSubtitle={onSetSubtitle} />
  } else {
    view = <Login />
  }

  return (
    <div className="App container">
      <header className="App-header">
        <div className="d-sm-none d-block mb-5" />
        <TopMenu loggedIn={!!accessToken} />
        <h1>
          <FontAwesomeIcon icon={['fab', 'spotify']} color="#84BD00" size="sm" /> <a href={process.env.PUBLIC_URL}>Exportify</a>
        </h1>
        <p id="subtitle" className="lead text-secondary">{subtitle}</p>
      </header>

      {view}
    </div>
  );
}

export default App;