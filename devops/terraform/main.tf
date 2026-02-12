# AWS Infrastructure for RoamIQ
provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "roamiq_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "roamiq-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.roamiq_vpc.id
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.roamiq_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  tags = { Name = "roamiq-public-subnet" }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.roamiq_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group
resource "aws_security_group" "roamiq_sg" {
  name   = "roamiq-sg"
  vpc_id = aws_vpc.roamiq_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Limit this in production!
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "roamiq_server" {
  ami           = var.ami_id
  instance_type = "t3.large" # Needed for Ollama and ELK
  subnet_id     = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.roamiq_sg.id]
  key_name      = var.key_name

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y docker.io docker-compose
              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -aG docker ubuntu
              mkdir -p /app/roamiq
              cd /app/roamiq
              # Clone repo or download docker-compose
              EOF

  tags = { Name = "RoamIQ-Production-Server" }
}

output "server_public_ip" {
  value = aws_instance.roamiq_server.public_ip
}
