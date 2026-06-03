import React from "react"
import { withTranslation, WithTranslation } from "react-i18next"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getQueryParam } from "helpers"

class Login extends React.Component<WithTranslation> {
  generateRandomString(length: number) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async generateCodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const uint8Array = new Uint8Array(digest);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString)
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  authorize() {
    let clientId = getQueryParam("app_client_id")
    let changeUser = getQueryParam("change_user") !== ""
    
    if (clientId === '') {
      clientId = "2c8e4d6d067648c4a95095f20b508cc6"
    }

    const codeVerifier = this.generateRandomString(64);
    this.generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      localStorage.setItem('code_verifier', codeVerifier);

      // ?? Usar la misma lógica que en App.tsx para consistencia
      const redirectUri = window.location.origin + window.location.pathname;

      window.location.href = "https://accounts.spotify.com/authorize" +
        "?client_id=" + clientId +
        "&redirect_uri=" + encodeURIComponent(redirectUri) +
        "&scope=playlist-read-private%20playlist-read-collaborative%20user-library-read" +
        "&response_type=code" +
        "&code_challenge_method=S256" +
        "&code_challenge=" + codeChallenge +
        "&show_dialog=" + changeUser;
    });
  }

  render() {
    return (
      <Button id="loginButton" type="submit" variant="outline-secondary" size="lg" onClick={this.authorize} >
        <FontAwesomeIcon icon={['far', 'check-circle']} size="sm" /> {this.props.i18n.t("get_started")}
      </Button >
    )
  }
}

export default withTranslation()(Login)