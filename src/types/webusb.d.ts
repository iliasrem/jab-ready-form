// Types pour WebUSB API
interface USBDevice {
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
}

interface USBOutTransferResult {
  bytesWritten: number
  status: 'ok' | 'stall' | 'babble'
}

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USB {
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
}

interface Navigator {
  usb?: USB
}