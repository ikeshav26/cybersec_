data "digitalocean_ssh_key" "default" {
  name = var.ssh_key_name
}

resource "digitalocean_vpc" "custom_vpc" {
  name   = "cybersuite-vpc-${var.region}"
  region = var.region
}

resource "digitalocean_droplet" "web_server" {
  name     = "cybersuite-server"
  image    = "ubuntu-24-04-x64"
  region   = var.region
  size     = var.droplet_size
  vpc_uuid = digitalocean_vpc.custom_vpc.id
  ssh_keys = [data.digitalocean_ssh_key.default.id]
  tags     = ["production", "cybersuite"]
}


resource "digitalocean_firewall" "web_firewall" {
  name = "cybersuite-firewall"

  droplet_ids = [digitalocean_droplet.web_server.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
