variable "do_token" {
  description = "DigitalOcean API Token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean Region"
  type        = string
  default     = "blr1"
}

variable "droplet_size" {
  description = "Droplet Size (RAM/CPU)"
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "ssh_key_name" {
  description = "Name of the SSH Key in DigitalOcean"
  type        = string
  default     = "cybersuite-deploy-key"
}

variable "pub_key_path" {
  description = "Path to your local public SSH key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
