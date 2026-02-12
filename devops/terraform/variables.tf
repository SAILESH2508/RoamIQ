variable "aws_region" {
  description = "AWS region to deploy in"
  default     = "us-east-1"
}

variable "ami_id" {
  description = "Ubuntu 22.04 AMI ID"
  default     = "ami-053b0d53c279acc90" # Verify for your region
}

variable "key_name" {
  description = "SSH key name for the instance"
}
