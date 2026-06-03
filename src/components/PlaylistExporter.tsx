import { saveAs } from "file-saver"
import * as XLSX from 'xlsx'
import i18n from "../i18n/config"

import TracksData from "components/data/TracksData"
import TracksBaseData from "components/data/TracksBaseData"
import TracksArtistsData from "components/data/TracksArtistsData"
import TracksAudioFeaturesData from "components/data/TracksAudioFeaturesData"
import TracksAlbumData from "components/data/TracksAlbumData"

class TracksXlsxFile {
  playlist: any
  trackItems: any
  columnNames: string[]
  lineData: Map<string, string[]>

  lineTrackUris: string[]
  lineTrackData: string[][]

  // Palabras clave para excluir (en cualquier idioma)
  private static readonly EXCLUDED_KEYWORDS: string[] = [
    "URI",
    "uri"
  ]

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

  // Verificar si una columna debe ser excluida
  private shouldExcludeColumn(columnName: string): boolean {
    // Excluir si contiene alguna palabra clave
    for (const keyword of TracksXlsxFile.EXCLUDED_KEYWORDS) {
      if (columnName.includes(keyword)) {
        return true
      }
    }
    return false
  }

  async addData(tracksData: TracksData, before: boolean = false) {
    const allLabels = tracksData.dataLabels()
    
    // Filtrar columnas que contengan palabras clave de exclusión
    const filteredLabels: string[] = []
    const filteredIndices: number[] = []
    
    // Guardar los índices de las columnas que NO se excluyen
    allLabels.forEach((label: string, idx: number) => {
      if (!this.shouldExcludeColumn(label)) {
        filteredLabels.push(label)
        filteredIndices.push(idx)
      }
    })
    
    // Agregar nombres de columnas filtrados
    if (before) {
      this.columnNames.unshift(...filteredLabels)
    } else {
      this.columnNames.push(...filteredLabels)
    }

    const data: Map<string, string[]> = await tracksData.data()

    this.lineTrackUris.forEach((uri: string, index: number) => {
      if (data.has(uri)) {
        const values = data.get(uri)!
        
        // Extraer solo los valores de las columnas no excluidas
        const filteredValues = filteredIndices.map((idx: number) => values[idx] || '')
        
        if (before) {
          this.lineTrackData[index].unshift(...filteredValues)
        } else {
          this.lineTrackData[index].push(...filteredValues)
        }
      }
    })
  }

  content(): Uint8Array {
    // Convertir los datos a formato de objetos para SheetJS
    const rows = this.lineTrackData.map((rowData, index) => {
      const row: any = {};
      this.columnNames.forEach((colName, colIndex) => {
        row[colName] = rowData[colIndex] || '';
      });
      return row;
    });

    // Crear hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Ajustar anchos de columnas
    const maxWidths = this.columnNames.map(colName => ({
      wch: Math.min(Math.max(colName.length, 15), 50)
    }));
    worksheet['!cols'] = maxWidths;
    
    // Crear libro
    const workbook = XLSX.utils.book_new();
    const sheetName = (this.playlist.name || 'Playlist').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }
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
    return this.xlsxData().then((data) => {
      var blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      saveAs(blob, this.fileName(), { autoBom: false })
    })
  }

  async xlsxData() {
    const tracksBaseData = new TracksBaseData(this.accessToken, this.playlist)
    const items = await tracksBaseData.trackItems()
    const tracks = items.map(i => i.track)
    const tracksXlsxFile = new TracksXlsxFile(this.playlist, items)

    // Add base data before existing (item) data, for backward compatibility
    await tracksXlsxFile.addData(tracksBaseData, true)

    if (this.config.includeArtistsData) {
      await tracksXlsxFile.addData(new TracksArtistsData(this.accessToken, tracks))
    }

    if (this.config.includeAudioFeaturesData) {
      await tracksXlsxFile.addData(new TracksAudioFeaturesData(this.accessToken, tracks))
    }

    if (this.config.includeAlbumData) {
      await tracksXlsxFile.addData(new TracksAlbumData(this.accessToken, tracks))
    }

    return tracksXlsxFile.content()
  }

  fileName(withExtension: boolean = true): string {
    return this.playlist.name.replace(/[\x00-\x1F\x7F/\\<>:;"|=,.?*[\] ]+/g, "_").toLowerCase() + (withExtension ? this.fileExtension() : "")
  }

  fileExtension(): string {
    return ".xlsx"
  }
}

export default PlaylistExporter