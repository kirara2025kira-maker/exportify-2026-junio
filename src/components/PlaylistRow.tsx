import React from "react"
import { withTranslation, WithTranslation } from "react-i18next"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { apiCallErrorHandler } from "helpers"
import PlaylistExporter from "./PlaylistExporter"

interface PlaylistRowProps extends WithTranslation {
  accessToken: string,
  key: string,
  playlist: any,
  config: any,
  isSelected: boolean,
  onToggleSelect: (playlistId: string) => void
}

class PlaylistRow extends React.Component<PlaylistRowProps> {
  state = {
    exporting: false
  }

  exportPlaylist = () => {
    this.setState(
      { exporting: true },
      () => {
        (new PlaylistExporter(
          this.props.accessToken,
          this.props.playlist,
          this.props.config
        )).export().catch(apiCallErrorHandler).then(() => {
          this.setState({ exporting: false })
        })
      }
    )
  }

  renderTickCross(condition: boolean) {
    if (condition) {
      return <FontAwesomeIcon icon={['far', 'check-circle']} size="sm" />
    } else {
      return <FontAwesomeIcon icon={['far', 'times-circle']} size="sm" className="opacity-25" />
    }
  }

  renderIcon(playlist: any) {
    if (playlist.name === 'Liked') {
      return <FontAwesomeIcon icon={['far', 'heart']} style={{ color: 'red' }} />;
    } else {
      return <FontAwesomeIcon icon={['fas', 'music']} />;
    }
  }

  render() {
    let playlist = this.props.playlist
    const icon: any = this.state.exporting ? ['fas', 'sync'] : ['fas', 'download']
    const canSelect = playlist.uri != null

    if (playlist.uri == null) return (
      <tr key={this.props.key}>
        <td className="icon d-flex align-items-center gap-2">
          <input type="checkbox" disabled={true} />
          {this.renderIcon(playlist)}
        </td>
        <td>{playlist.name}</td>
        <td className="d-none d-sm-table-cell" colSpan={2}>{this.props.i18n.t("playlist.not_supported")}</td>
        <td className="d-none d-sm-table-cell">{this.renderTickCross(playlist.public)}</td>
        <td className="d-none d-md-table-cell">{this.renderTickCross(playlist.collaborative)}</td>
        <td>&nbsp;</td>
      </tr>
    );

    return (
      <tr key={this.props.key}>
        <td className="icon d-flex align-items-center gap-2">
          <input 
            type="checkbox" 
            checked={this.props.isSelected}
            onChange={() => this.props.onToggleSelect(this.props.playlist.id)}
          />
          {this.renderIcon(playlist)}
        </td>
        <td><a href={playlist.uri}>{playlist.name}</a></td>
        <td><a href={playlist.owner.uri}>{playlist.owner.display_name}</a></td>
        <td className="d-none d-sm-table-cell">{playlist.tracks.total}</td>
        <td className="d-none d-sm-table-cell">{this.renderTickCross(playlist.public)}</td>
        <td className="d-none d-md-table-cell">{this.renderTickCross(playlist.collaborative)}</td>
        <td className="text-end">
          <Button 
            type="submit" 
            variant="primary" 
            size="sm"
            onClick={this.exportPlaylist} 
            disabled={this.state.exporting} 
            className="text-nowrap"
            title={this.state.exporting ? "Exportando a XLSX..." : "Exportar a XLSX"}
          >
            <FontAwesomeIcon icon={icon} size="sm" spin={this.state.exporting} /> 
            {this.state.exporting ? "Exportando..." : "Exportar"}
          </Button>
        </td>
      </tr>
    );
  }
}

export default withTranslation()(PlaylistRow)