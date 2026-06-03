import { saveAs } from "file-saver"
import i18n from "../i18n/config"
import * as XLSX from 'xlsx'; // <-- NUEVO: Importamos la librería de Excel

import TracksData from "components/data/TracksData"
import TracksBaseData from "components/data/TracksBaseData"
import TracksArtistsData from "components/data/TracksArtistsData"
import TracksAudioFeaturesData from "components/data/TracksAudioFeaturesData"
import TracksAlbumData from "components/data/TracksAlbumData"

class TracksCsvFile {
  playlist: any
  trackItems: any
  columnNames: string[]
  lineData: Map<string, string[]>

  lineTrackUris: string[]
  lineTrackData: string[][]

  constructor(playlist: any, trackItems: any) {
    this.playlist = playlist
    this.trackItems = trackItems
    this.columnNames = [
      i18n.t("track.added_by"),
      i18n.t("track.added_at")
    ]

    this.lineData = new Map()
    this.lineTrackUris = trackItems.map((i: any) => i.track.uri)
    this.lineTrackData = trackItems.map((i: any) => [
      i.added_by == null ? '' : i.added_by.uri,
      i.added_at
    ])
  }

  async addData(tracksData: TracksData, before = false) {
    if (before) {
      this.columnNames.unshift(...tracksData.dataLabels())
    } else {
      this.columnNames.push(...tracksData.dataLabels())
    }

    const data: Map<string, string[]> = await tracksData.data()

    this.lineTrackUris.forEach((uri: string, index: number) => {
      if (data.has(uri)) {
        if (before) {
          this.lineTrackData[index].unshift(...data.get(uri)!)
        } else {
          this.lineTrackData[index].push(...data.get(uri)!)
        }
      }
    })
  }

  // CAMBIO: En lugar de generar un string CSV, devolvemos un "Array of Arrays" (AOA)
  // que es el formato nativo que XLSX necesita para crear la hoja de cálculo.
  getExportData(): any[][] {
    return [this.columnNames, ...this.lineTrackData];
  }
  
  // NOTA: Los métodos content() y sanitize() ya no son necesarios 
  // porque XLSX maneja el formato y los tipos de datos internamente.
}

// Handles exporting a single playlist as an XLSX file
class PlaylistExporter {
  accessToken: string
  playlist: any
  config: any

  constructor(accessToken: string, playlist: any, config: any) {
    this.accessToken = accessToken
    this.playlist = playlist
    this.config = config
  }

  async export() {
    const blob = await this.getBlob()
    saveAs(blob, this.fileName())
  }

  // NUEVO: Método que genera el Blob de Excel. 
  // Lo he separado para que sea fácil de usar si tienes un exportador de ZIP.
  async getBlob(): Promise<Blob> {
    const data = await this.excelData()
    
    // 1. Creamos la hoja de cálculo a partir del Array of Arrays
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    // 2. Limitamos el nombre de la hoja a 31 caracteres (límite de Excel) y limpiamos caracteres inválidos
    const sheetName = this.playlist.name.substring(0, 31).replace(/[:\\/?*[\]]/g, "")
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Playlist")

    // 3. Generamos el buffer binario del archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    
    // 4. Creamos el Blob con el tipo MIME correcto para archivos .xlsx
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  }

  // Renombrado de csvData a excelData para reflejar el nuevo formato
  async excelData() {
    const tracksBaseData = new TracksBaseData(this.accessToken, this.playlist)
    const items = await tracksBaseData.trackItems()
    const tracks = items.map(i => i.track)
    const tracksCsvFile = new TracksCsvFile(this.playlist, items)

    // Add base data before existing (item) data, for backward compatibility
    await tracksCsvFile.addData(tracksBaseData, true)

    if (this.config.includeArtistsData) {
      await tracksCsvFile.addData(new TracksArtistsData(this.accessToken, tracks))
    }

    if (this.config.includeAudioFeaturesData) {
      await tracksCsvFile.addData(new TracksAudioFeaturesData(this.accessToken, tracks))
    }

    if (this.config.includeAlbumData) {
      await tracksCsvFile.addData(new TracksAlbumData(this.accessToken, tracks))
    }

    return tracksCsvFile.getExportData() // Devuelve el Array of Arrays
  }

  fileName(withExtension = true): string {
    return this.playlist.name.replace(/[\x00-\x1F\x7F/\\<>:;"|=,.?*[\] ]+/g, "_").toLowerCase() + (withExtension ? this.fileExtension() : "") // eslint-disable-line no-control-regex
  }

  fileExtension(): string {
    return ".xlsx" // CAMBIO: Ahora devuelve .xlsx
  }
}

export default PlaylistExporter