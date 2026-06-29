output "server_ip" {
  description = "The public IP address of the Droplet"
  value       = digitalocean_droplet.web_server.ipv4_address
}
